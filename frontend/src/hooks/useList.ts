import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { errorMessage, getList } from "../api/client";

export function useList<T extends z.ZodType>(url: string, schema: T) {
  const [data, setData] = useState<z.infer<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // ถ้าเปลี่ยนหน้า/โหลดใหม่ก่อน request เก่าเสร็จ จะไม่เอาผลเก่ามาทับ
    let cancelled = false;
    getList(url, schema)
      .then((rows) => {
        if (cancelled) return;
        setData(rows);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, schema, version]);

  const reload = useCallback(() => {
    setLoading(true);
    setVersion((v) => v + 1);
  }, []);

  return { data, loading, error, reload };
}
