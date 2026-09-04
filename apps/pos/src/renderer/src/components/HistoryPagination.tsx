import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";

export const historyPageSizes = [20, 40, 60] as const;

export function useHistoryPagination<T>(items: T[], resetKey = "") {
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const startIndex = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    pageCount,
    paginatedItems: items.slice(startIndex, startIndex + pageSize),
    setPage,
    setPageSize,
  };
}

interface HistoryPaginationProps {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function HistoryPagination({
  total,
  page,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
}: HistoryPaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="history-pagination" aria-label="Paginación del historial">
      <div className="history-page-size">
        <span>Visualizar</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger aria-label="Registros por página">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {historyPageSizes.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} registros
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <span className="history-page-range">
        {start}–{end} de {total} registros
      </span>
      <div className="history-page-actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={15} /> Anterior
        </Button>
        <strong>{page} / {pageCount}</strong>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  );
}
