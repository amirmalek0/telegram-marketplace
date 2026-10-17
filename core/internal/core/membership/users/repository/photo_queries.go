package repository

const queryUpdatePhotoURL = `UPDATE users SET photo_url=$2 WHERE id=$1`
