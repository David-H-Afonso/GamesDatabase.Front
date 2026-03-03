import './AdminFallback.scss'

const SIDEBAR_BONE_WIDTHS = [80, 120, 100, 110, 95, 105]

const AdminFallback = () => (
	<div className='admin-fallback'>
		<div className='admin-fallback__header' />
		<div className='admin-fallback__body'>
			<div className='admin-fallback__sidebar'>
				{SIDEBAR_BONE_WIDTHS.map((w, i) => (
					<div key={i} className='admin-fallback-bone' style={{ width: w }} />
				))}
			</div>
			<div className='admin-fallback__content'>
				<div className='admin-fallback-bone admin-fallback-bone--title' />
				<div className='admin-fallback-bone admin-fallback-bone--toolbar' />
				{[1, 2, 3, 4, 5].map((i) => (
					<div key={i} className='admin-fallback-bone admin-fallback-bone--row' />
				))}
			</div>
		</div>
	</div>
)

export default AdminFallback
