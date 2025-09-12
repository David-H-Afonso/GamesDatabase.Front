import '../components/HomeComponent.scss'
import HomeComponent from '../components/HomeComponent'
import { useEffect, useState } from 'react'

const Home = () => {
	const [data, setData] = useState('')

	const fetchSuperImportantData = async () => {
		// Here your amazing fetching data logic
		setData('Fetched Data')
	}

	useEffect(() => {
		fetchSuperImportantData()
	}, [])

	return <HomeComponent test={data} />
}

export default Home
