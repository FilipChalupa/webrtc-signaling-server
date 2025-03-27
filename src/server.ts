import { parseArgs } from '@std/cli/parse-args'
import { serveDir } from '@std/http/file-server'
import { route, type Route } from '@std/http/unstable-route'

const defaultPort = 8080

const port = (() => {
	const argumentsPort = parseArgs(Deno.args).port
	const numberPort = argumentsPort ? Number(argumentsPort) : null
	return numberPort && !Number.isNaN(numberPort) ? numberPort : defaultPort
})()

const routes: Route[] = [
	{
		pattern: new URLPattern({ pathname: '/*' }),
		handler: (request: Request) =>
			serveDir(request, {
				fsRoot: './public',
			}),
	},
]

const defaultHandler = () => new Response('Not found', { status: 404 })

Deno.serve({ port }, route(routes, defaultHandler))

console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`)
