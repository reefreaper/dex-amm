// LayoutShell.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Home, Building2, Calendar, Users, ClipboardList, ListChecks, BarChart2, Settings, Plus, Shield } from 'lucide-react'

// Import the logo
import logo from '../docs_img.jpeg';

const navItems = [
	{ label: 'Dashboard', icon: <Home size={18} />, id: 'dashboard' },
	//{ label: 'Create Asset', icon: <Plus size={18} />, id: 'create-asset' },
	{ label: 'Whitelist', icon: <Shield size={18} />, id: 'whitelist-management' },
	{ label: 'Contracts', icon: <Home size={18} />, id: 'contracts' },
	{ label: 'Facilities', icon: <Building2 size={18} />, id: 'facilities' },
	{ label: 'Calendar', icon: <Calendar size={18} />, id: 'calendar' },
	{ label: 'Tasks', icon: <ListChecks size={18} />, id: 'tasks' },
	{ label: 'Referrals', icon: <Users size={18} />, id: 'referrals' },
	{ label: 'Activities', icon: <ClipboardList size={18} />, id: 'activities' },
	{ label: 'Reports', icon: <BarChart2 size={18} />, id: 'reports' },
	{ label: 'Settings', icon: <Settings size={18} />, id: 'settings' }
]

export default function LayoutShell() {
	const navigate = useNavigate()
	const location = useLocation()
	
	// Extract the current route from location
	const currentRoute = location.pathname.split('/')[1] || 'dashboard'
	const [active, setActive] = useState(currentRoute)

	// Add console log to debug
	useEffect(() => {
		console.log("LayoutShell rendered");
		console.log("Current route:", location.pathname);
		// Check if logo loaded
		console.log("Logo imported:", logo);
	}, [location.pathname]);

	const handleNavigation = (id) => {
		console.log("Navigation clicked:", id);
		setActive(id)
		navigate(`/${id}`)
	}

	return (
		<div className="flex h-screen overflow-x-hidden">
			{/* Sidebar */}
			<aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
				<div className="p-2 font-bold text-lg border-b border-gray-200 text-gray-500">
					<div className="flex items-center">
						<img
							alt="logo"
							src={logo}
							width="40"
							height="40"
							className="inline-block align-middle mr-2"
						/>
						<span className="text-gray-600">GeoCities</span>
					</div>
				</div>
				<nav className="flex-1 overflow-y-auto">
					{navItems.map((item) => (
						<button
							key={item.id}
							onClick={() => handleNavigation(item.id)}
							className={`flex items-center px-4 py-3 text-sm w-full text-left hover:bg-gray-100 
								${active === item.id 
									? 'bg-gray-200 font-semibold text-gray-800' 
									: 'text-gray-700'
								}`}
						>
							<span className="mr-2">{item.icon}</span>
							{item.label}
						</button>
					))}
				</nav>
			</aside>

			{/* Main content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Top Toolbar */}
				<header className="h-12 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
					<div className="text-sm text-gray-700">Today is {new Date().toLocaleDateString()}</div>
					<div className="text-sm text-gray-700">Welcome, Citizen</div>
				</header>

				{/* App content - Use Outlet to render child routes */}
				<main className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-100">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
