import { Link } from 'react-router-dom'
import './NotFound.scss'

export const NotFound = () => {
	return (
		<div className='not-found'>
			<div className='not-found-content'>
				<div className='not-found-code'>404</div>
				<h1>Page Not Found</h1>
				<p>The page you are looking for does not exist or has been moved.</p>
				<Link to='/' className='btn btn-primary'>
					Go to Home
				</Link>
			</div>
		</div>
	)
}
