import { Button } from '@/components/elements'
import type { FC } from 'react'

interface Props {
	// Define any props if needed
	test: any
}

const HomeComponent: FC<Props> = (props) => {
	const { test } = props
	console.log(test)

	return (
		<div className='home-component'>
			<h1>HomeComponent</h1>
			<Button title='Click Me' onPress={() => console.log('Button Pressed')} />
		</div>
	)
}

export default HomeComponent
