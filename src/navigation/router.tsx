import { createBrowserRouter } from 'react-router-dom'
import Home from '@/components/Home/containers/Home'

// TODO: DO THIS BETTER AND WITH CUSTOM ROUTES IN SEPARATE FILES

export const router = createBrowserRouter([
	{
		path: '/',
		element: <Home />,
		errorElement: <Home />,
		children: [
			{
				index: true,
				element: <Home />,
			},
			{
				path: 'settings',
				element: <Home />,
			},
		],
	},
	{
		path: '*',
		element: <div>Page not found</div>,
		errorElement: <Home />,
	},
])
