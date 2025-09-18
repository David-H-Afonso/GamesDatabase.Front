import { environment as devEnvironment } from './dev/environment.dev'
import { environment as prodEnvironment } from './prod/environment.prod'

export const environment = import.meta.env.PROD ? prodEnvironment : devEnvironment
export { apiRoutes } from './apiRoutes'
