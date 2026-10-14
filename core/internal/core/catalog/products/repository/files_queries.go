package repository

const queryDeleteProductFiles = `DELETE FROM product_files WHERE product_id = $1`
const queryInsertProductFile = `INSERT INTO product_files (product_id, file_id, sort_order) VALUES ($1, $2, $3)`
