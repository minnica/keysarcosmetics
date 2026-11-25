-- Una única lectura consistente. El importador ejecuta esta consulta en REPEATABLE READ, READ ONLY.
WITH clock AS (
  SELECT coalesce(nullif(current_setting('payroll_pilot.as_of', true), '')::date,
                  (now() AT TIME ZONE 'America/Mexico_City')::date) AS day
), current_period AS (
  SELECT date_trunc('month',day)::date + CASE WHEN extract(day FROM day)>15 THEN 15 ELSE 0 END AS start FROM clock
), bounds AS (
  SELECT p.start AS open_start, coalesce(
    (SELECT r."periodStart" FROM public."PayrollRun" r WHERE r.status IN ('PAID','APPROVED')
     AND r."periodEnd"<p.start ORDER BY r."periodEnd" DESC, r."paidAt" DESC NULLS LAST LIMIT 1),
    CASE WHEN extract(day FROM p.start)=16 THEN p.start-15 ELSE (p.start-interval '1 month')::date+15 END
  ) AS closed_start FROM current_period p
), periods AS (
  SELECT s AS start, CASE WHEN extract(day FROM s)=1 THEN s+14 ELSE (date_trunc('month',s)+interval '1 month - 1 day')::date END AS finish
  FROM bounds b CROSS JOIN LATERAL (VALUES (b.closed_start),(b.open_start)) p(s)
), runs AS (
  SELECT DISTINCT ON (r."periodStart") r.id, r."periodStart",r."periodEnd",r."payDate",r.mode,r.status
  FROM public."PayrollRun" r JOIN periods p ON r."periodStart"=p.start AND r."periodEnd"=p.finish
  WHERE r.status<>'CANCELED' ORDER BY r."periodStart", CASE r.status WHEN 'PAID' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END, r."createdAt" DESC,r.id
), sales AS (
  SELECT v.id,v."vendedorId" AS "employeeId",v."sucursalId" AS "branchId",v.fecha::date AS date,coalesce(sum(d.cantidad),0) AS amount
  FROM public."Venta" v JOIN periods p ON v.fecha>=p.start AND v.fecha<p.finish+1
  LEFT JOIN public."VentaDetalle" d ON d."ventaId"=v.id GROUP BY v.id
), movements AS (
  SELECT a.id,a."employeeId",a."branchId",a.amount,a.commissionable,m.kind,m.date,m.status,m."payrollType",m."catalogItemId",
         coalesce(c.name,m.kind::text) AS concept
  FROM public."PayrollMovementAllocation" a JOIN public."PayrollMovement" m ON a."movementId"=m.id
  JOIN periods p ON m.date BETWEEN p.start AND p.finish LEFT JOIN public."PayrollCatalogItem" c ON c.id=m."catalogItemId"
), loans AS (
  SELECT l.id,l."employeeId",l.kind,l."requestedAt",l."requestedAmount",l."installmentCount",l."paidAmount",l.balance,l.status,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('start',i."periodStart",'end',i."periodEnd",'amount',i.amount,'status',i.status) ORDER BY i.sequence),'[]') FROM public."LoanAdvanceInstallment" i WHERE i."loanAdvanceId"=l.id) installments
  FROM public."LoanAdvance" l WHERE l.status='PENDING' OR EXISTS (
    SELECT 1 FROM public."LoanAdvanceInstallment" i JOIN periods p ON i."periodStart"=p.start WHERE i."loanAdvanceId"=l.id)
), lines AS (
  SELECT l."payrollRunId",l."employeeId",l."salaryPayment",l.commission,l.bonus,l.fine,l."adjustmentPositive",l."adjustmentNegative",
    l."perDiem",l.supplies,l."loanPayment",l."totalPayment",r.status AS "receiptStatus",
    (SELECT coalesce(jsonb_agg(jsonb_build_object('branchId',b."branchId",'branchName',b."branchName",'cost',b."totalCost") ORDER BY b."branchName"),'[]')
     FROM public."PayrollRunBranchLine" b WHERE b."payrollRunLineId"=l.id) branches
  FROM public."PayrollRunLine" l JOIN runs ON runs.id=l."payrollRunId" LEFT JOIN public."PayrollReceipt" r ON r."payrollRunLineId"=l.id
), employees AS (
  SELECT e.id,e."nombreCompleto" AS name,e.sueldo AS salary,e.activo AS active,e."sucursalId" AS "branchId",coalesce(p.nombre,e.puesto) AS position
  FROM public."Empleado" e LEFT JOIN public."Position" p ON p.id=e."positionId"
  WHERE e.activo OR e.id IN (SELECT "employeeId" FROM sales UNION SELECT "employeeId" FROM movements UNION SELECT "employeeId" FROM loans UNION SELECT "employeeId" FROM lines)
), schemes AS (
  SELECT v.id,v."schemeId",s.name,s.active,v."effectiveFrom",v.version,
   (SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'from',t."fromAmount",'to',t."toAmount",'rate',t.rate) ORDER BY t."sortOrder"),'[]')
    FROM public."CommissionSchemeTier" t WHERE t."versionId"=v.id) tiers
  FROM public."CommissionSchemeVersion" v JOIN public."CommissionScheme" s ON s.id=v."schemeId"
), assignments AS (
  SELECT a.id,a."employeeId",a."schemeId",a."effectiveFrom",a."effectiveTo" FROM public."EmployeeCommissionAssignment" a
  WHERE a."employeeId" IN (SELECT id FROM employees) AND EXISTS (
    SELECT 1 FROM periods p WHERE a."effectiveFrom"<=p.finish AND (a."effectiveTo" IS NULL OR a."effectiveTo">=p.start))
), branches AS (
  SELECT id,nombre AS name,activa AS active,"creadoEn"::date AS "createdAt","desactivadaEn"::date AS "endedAt" FROM public."Sucursal"
), catalog AS (
  SELECT id,kind,name,"defaultAmount",active FROM public."PayrollCatalogItem"
)
SELECT jsonb_build_object('format',1,'capturedAt',transaction_timestamp(),'openStart',b.open_start,'closedStart',b.closed_start,
 'periods',(SELECT jsonb_agg(to_jsonb(p) ORDER BY start) FROM periods p),
 'employees',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY id),'[]') FROM employees e),
 'branches',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY id),'[]') FROM branches s),
 'sales',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY id),'[]') FROM sales v),
 'schemes',(SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY "effectiveFrom",id),'[]') FROM schemes v),
 'assignments',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY "effectiveFrom",id),'[]') FROM assignments a),
 'catalog',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY id),'[]') FROM catalog c),
 'movements',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY id),'[]') FROM movements m),
 'loans',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY id),'[]') FROM loans l),
 'runs',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY "periodStart"),'[]') FROM runs r),
 'lines',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY "payrollRunId","employeeId"),'[]') FROM lines l)
) AS snapshot FROM bounds b
