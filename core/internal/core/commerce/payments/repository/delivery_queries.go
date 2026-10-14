package repository

const (
	queryListDeliveries = `
		SELECT d.id,d.order_id,d.product_id,d.product_title,d.status,d.error,d.created_at,d.delivered_at
		FROM order_deliveries d JOIN users u ON u.id=d.user_id JOIN orders o ON o.id=d.order_id
		WHERE u.telegram_id=$1 AND o.status='paid' AND ($2='' OR d.product_id=NULLIF($2,'')::uuid)
		ORDER BY d.created_at DESC`
	queryListDeliveryItems = `
		SELECT i.kind,i.label,COALESCE(i.content,''),COALESCE(f.name,''),COALESCE(f.mime_type,''),COALESCE(f.size,0),COALESCE(f.storage_id,'')
		FROM order_delivery_items i LEFT JOIN files f ON f.id=i.file_id
		WHERE i.delivery_id=$1 AND i.status='ready' ORDER BY i.sort_order`
)
