package repository

// SQL query constants for the vip_plans repository.

const (
	// queryCreatePlan inserts a new VIP plan and returns the generated UUID.
	queryCreatePlan = `
		INSERT INTO vip_plans (title, stars_price, duration, tier, status, created_at, toman_price)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

	// queryGetPlanByID retrieves a VIP plan by its UUID.
	queryGetPlanByID = `
		SELECT toman_price, id, title, stars_price, duration, tier, status, created_at
		FROM vip_plans
		WHERE id = $1`

	// queryListPlans retrieves a paginated list of VIP plans ordered by created_at.
	queryListPlans = `
		SELECT toman_price, id, title, stars_price, duration, tier, status, created_at
		FROM vip_plans
		ORDER BY tier ASC, duration ASC, created_at ASC
		LIMIT $1 OFFSET $2`

	// queryCountPlans returns the total number of VIP plans.
	queryCountPlans = `SELECT COUNT(*) FROM vip_plans`

	// queryUpdatePlan updates the mutable fields of a VIP plan.
	queryUpdatePlan = `
		UPDATE vip_plans SET
			title = $1,
			stars_price = $2,
			duration = $3,
			tier = $4,
			status = $5, toman_price=$7
		WHERE id = $6`

	// queryDeletePlan removes a VIP plan by ID.
	queryDeletePlan = `DELETE FROM vip_plans WHERE id = $1`
)
