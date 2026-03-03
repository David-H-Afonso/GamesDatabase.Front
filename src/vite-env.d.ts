/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare const __APP_VERSION__: string
declare const __COMMIT_HASH__: string
declare const __BUILD_DATE__: string

// Declaraciones para importar SVGs con SVGR
declare module '*.svg?react' {
	import React from 'react'
	const ReactComponent: React.ComponentType<React.SVGProps<SVGSVGElement>>
	export default ReactComponent
}

// Declaraciones para importar SVGs como URL (fallback)
declare module '*.svg' {
	const content: string
	export default content
}
