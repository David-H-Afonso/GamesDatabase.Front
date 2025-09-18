export { default as gamePlatformReducer } from './gamePlatformSlice'
export * from './thunk'
export {
	selectPlatforms,
	selectActivePlatforms,
	selectPlatformLoading,
	selectPlatformError,
	selectPlatformPagination,
	selectPlatformFilters,
	selectPlatformState,
	selectPlatformById,
} from './selector'
