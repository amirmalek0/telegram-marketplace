package repository

// SQL query constants for the vip_plans repository.

const (
	// queryCreatePlan inserts a new VIP plan and returns the generated UUID.
	queryCreatePlan = `
		INSERT INTO vip_plans (title, price, duration, status, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	// queryGetPlanByID retrieves a VIP plan by its UUID.
	queryGetPlanByID = `
		SELECT id, title, price, duration, status, created_at
		FROM vip_plans
		WHERE id = $1`

	// queryListPlans retrieves a paginated list of VIP plans ordered by created_at.
	queryListPlans = `
		SELECT id, title, price, duration, status, created_at
		FROM vip_plans
		ORDER BY created_at ASC
		LIMIT $1 OFFSET $2`

	// queryCountPlans returns the total number of VIP plans.
	queryCountPlans = `SELECT COUNT(*) FROM vip_plans`

	// queryUpdatePlan updates the mutable fields of a VIP plan.
	queryUpdatePlan = `
		UPDATE vip_plans SET
			title = $1,
			price = $2,
			duration = $3,
			status = $4
		WHERE id = $5`

	// queryDeletePlan removes a VIP plan by ID.
	queryDeletePlan = `DELETE FROM vip_plans WHERE id = $1`
)
