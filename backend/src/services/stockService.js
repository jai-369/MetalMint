import { pool } from "../db/pool.js";

export async function getStockSummary() {
  const result = await pool.query(
    `
      SELECT
        pt.id AS product_type_id,
        pt.name AS product_type_name,
        pt.code AS product_type_code,
        COALESCE(
          mp.size_label,
          CONCAT(
            TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM mp.width::text)),
            ' x ',
            TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM mp.height::text))
          )
        ) AS size_display,
        mp.width,
        mp.height,
        mp.doors,
        mp.weight_class,
        COALESCE(latest_paint.paint_color, 'Unpainted') AS paint_color,
        mp.current_status,
        COUNT(*)::integer AS quantity
      FROM manufactured_products mp
      JOIN product_types pt ON pt.id = mp.product_type_id
      LEFT JOIN LATERAL (
        SELECT paint_color
        FROM painting_records pr
        WHERE pr.manufactured_product_id = mp.id
        ORDER BY pr.created_at DESC
        LIMIT 1
      ) latest_paint ON true
      GROUP BY
        pt.id,
        pt.name,
        pt.code,
        size_display,
        mp.width,
        mp.height,
        mp.doors,
        mp.weight_class,
        paint_color,
        mp.current_status
      ORDER BY pt.name ASC, size_display ASC, mp.doors ASC, mp.weight_class ASC, paint_color ASC, mp.current_status ASC
    `
  );

  return result.rows;
}
