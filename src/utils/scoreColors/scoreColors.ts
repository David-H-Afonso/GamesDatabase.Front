/**
 * Get Metacritic color based on score
 * @param score - Score value (0-100)
 * @returns Color string
 */
export const getMetacriticColor = (score: number): string => {
	if (score >= 75) return '#66cc33' // Green
	if (score >= 50) return '#ffcc33' // Yellow
	return '#ff0000' // Red
}
