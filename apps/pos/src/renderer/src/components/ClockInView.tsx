import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  History,
  KeyRound,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import type { AttendanceRecord, Seller } from "../types";
import { HistoryPagination, useHistoryPagination } from "./HistoryPagination";

interface ClockInViewProps {
  sellers: Seller[];
  branches: string[];
  records: AttendanceRecord[];
  onClockIn: (accessCode: string, branch: string) => boolean;
  onClockOut: (recordId: string) => void;
}

const formatDuration = (startIso: string, endIso: string | null, now: number) => {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : now;
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
};

const isToday = (createdAtIso: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(createdAtIso)) === formatter.format(new Date());
};

export function ClockInView({
  sellers,
  branches,
  records,
  onClockIn,
  onClockOut,
}: ClockInViewProps) {
  const [accessCode, setAccessCode] = useState("");
  const [branch, setBranch] = useState(branches[0] ?? "Polanco");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!branches.includes(branch)) setBranch(branches[0] ?? "");
  }, [branch, branches]);

  const onlineRecords = useMemo(
    () => records.filter((record) => record.status === "ONLINE"),
    [records],
  );
  const todayRecords = useMemo(
    () =>
      records
        .filter((record) => isToday(record.clockInAtIso))
        .sort((left, right) =>
          right.clockInAtIso.localeCompare(left.clockInAtIso),
        ),
    [records],
  );
  const attendancePagination = useHistoryPagination(todayRecords, "today");
  const attendedSellerIds = new Set(
    todayRecords.map((record) => record.sellerId),
  );
  const activeSellers = sellers.filter((seller) => seller.active);

  const submitClockIn = () => {
    if (!accessCode.trim() || !branch) return;
    const registered = onClockIn(accessCode.trim(), branch);
    if (registered) setAccessCode("");
  };

  return (
    <div className="clock-in-view">
      <Card className="clock-in-hero-card">
        <CardContent>
          <div className="clock-in-heading">
            <div className="clock-in-heading-icon">
              <Clock3 size={25} />
            </div>
            <div>
              <span className="section-kicker">CONTROL DE ASISTENCIA</span>
              <h2>Clock In de vendedores</h2>
              <p>
                El código registra asistencia exclusivamente; no abre ventas,
                reportes ni permisos administrativos.
              </p>
            </div>
          </div>
          <div className="clock-in-form">
            <div className="field-stack">
              <Label htmlFor="seller-clock-code">Código personal</Label>
              <div className="clock-in-input-shell">
                <KeyRound size={17} />
                <Input
                  id="seller-clock-code"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitClockIn();
                  }}
                  placeholder="Código de vendedor"
                />
              </div>
            </div>
            <div className="field-stack">
              <Label>Sucursal de asistencia</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger aria-label="Sucursal para Clock In">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={submitClockIn}
              disabled={accessCode.length !== 4 || !branch}
            >
              <LogIn size={17} /> Registrar entrada
            </Button>
          </div>
          <div className="clock-in-security-note">
            <ShieldCheck size={16} />
            <span>
              Los códigos permanecen ocultos. La sesión de asistencia es
              independiente del usuario operador del POS.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="clock-in-metrics">
        <Card>
          <CardContent>
            <Users size={19} />
            <span>Vendedores activos</span>
            <strong>{activeSellers.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <UserCheck size={19} />
            <span>Online ahora</span>
            <strong className="is-positive">{onlineRecords.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CheckCircle2 size={19} />
            <span>Asistieron hoy</span>
            <strong>{attendedSellerIds.size}</strong>
          </CardContent>
        </Card>
      </div>

      <Card className="clock-in-online-card">
        <CardContent>
          <div className="clock-in-section-heading">
            <div>
              <span className="section-kicker">ESTATUS EN TIEMPO REAL</span>
              <h2>Personal en sucursal</h2>
            </div>
            <Badge variant="outline">
              <span className="clock-in-live-dot" /> {onlineRecords.length} ONLINE
            </Badge>
          </div>
          <div className="clock-in-online-grid">
            {onlineRecords.map((record) => (
              <article key={record.id} className="clock-in-person-card">
                <div className="clock-in-avatar" aria-hidden="true">
                  {record.sellerInitials}
                </div>
                <div className="clock-in-person-copy">
                  <div>
                    <strong>{record.sellerName}</strong>
                    <span className="clock-in-online-status">
                      <i /> ONLINE
                    </span>
                  </div>
                  <span>
                    <Building2 size={13} /> {record.branch}
                  </span>
                  <small>
                    Entrada {record.clockInAt} ·{" "}
                    {formatDuration(record.clockInAtIso, null, now)}
                  </small>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onClockOut(record.id)}
                >
                  <LogOut size={15} /> Marcar salida
                </Button>
              </article>
            ))}
            {onlineRecords.length === 0 && (
              <div className="clock-in-empty-state">
                <Clock3 size={27} />
                <strong>No hay vendedores online</strong>
                <span>
                  Cada persona debe ingresar su código al llegar a la sucursal.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="data-card clock-in-history-card">
        <CardContent className="p-0">
          <div className="data-card-heading">
            <div>
              <span>BITÁCORA DEL DÍA</span>
              <h2>Entradas y salidas</h2>
            </div>
            <History size={20} />
          </div>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VENDEDOR</TableHead>
                  <TableHead>SUCURSAL</TableHead>
                  <TableHead>ENTRADA</TableHead>
                  <TableHead>SALIDA</TableHead>
                  <TableHead>DURACIÓN</TableHead>
                  <TableHead>ESTATUS</TableHead>
                  <TableHead>CIERRE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendancePagination.paginatedItems.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <strong>{record.sellerName}</strong>
                    </TableCell>
                    <TableCell>{record.branch}</TableCell>
                    <TableCell>{record.clockInAt}</TableCell>
                    <TableCell>{record.clockOutAt ?? "—"}</TableCell>
                    <TableCell>
                      {formatDuration(
                        record.clockInAtIso,
                        record.clockOutAtIso,
                        now,
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`clock-in-history-status is-${record.status.toLocaleLowerCase("en-US")}`}
                      >
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.clockOutReason === "CLOSE_DAY"
                        ? "Close Day"
                        : record.clockOutReason === "MANUAL"
                          ? "Manual"
                          : "Sesión abierta"}
                    </TableCell>
                  </TableRow>
                ))}
                {todayRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      Aún no se ha registrado asistencia durante el día.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <HistoryPagination
            total={todayRecords.length}
            page={attendancePagination.page}
            pageSize={attendancePagination.pageSize}
            pageCount={attendancePagination.pageCount}
            onPageChange={attendancePagination.setPage}
            onPageSizeChange={attendancePagination.setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
