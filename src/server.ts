import { parseArgs } from '@std/cli/parse-args'
import { serveDir } from '@std/http/file-server'
import { type Route, route } from '@std/http/unstable-route'

const defaultPort = 8080

const port = (() => {
	const argumentsPort = parseArgs(Deno.args).port
	const numberPort = argumentsPort ? Number(argumentsPort) : null
	return numberPort && !Number.isNaN(numberPort) ? numberPort : defaultPort
})()

const kv = await Deno.openKv()

const bodyToText = async (body: ReadableStream<Uint8Array>) => {
	const reader = body.getReader()
	const decoder = new TextDecoder()
	let result = ''
	while (true) {
		const { done, value } = await reader.read()
		if (done) {
			break
		}
		result += decoder.decode(value, { stream: true })
	}
	result += decoder.decode()
	return result
}

const createApiResponse = (data: unknown) =>
	Response.json(data, {
		headers: {
			'Access-Control-Allow-Origin': '*',
		},
	})

const routes: Route[] = [
	{
		method: ['GET', 'POST'],
		pattern: new URLPattern({
			pathname:
				'/api/v1/:side(initiator|responder)/:type(local-description|ice-candidate)',
		}),
		handler: async (request, patternResult) => {
			const method = request.method === 'POST' ? 'POST' : 'GET'
			const side = patternResult?.pathname.groups.side === 'initiator'
				? 'initiator'
				: 'responder'
			const type = patternResult?.pathname.groups.type === 'local-description'
				? 'local-description'
				: 'ice-candidate'
			if (method === 'POST') {
				if (!request.body) {
					throw new Error('No body')
				}
				const payload = bodyToText(request.body)
				if (type === 'local-description') {
					if (side === 'initiator') {
						await kv.delete(['local-description', 'responder'])
						await kv.delete(['ice-candidate', 'initiator'])
						await kv.delete(['ice-candidate', 'responder'])
					} else {
						await kv.delete(['local-description', 'initiator'])
					}
					await kv.set(['local-description', side], {
						createdAt: new Date().toISOString(),
						payload,
					})
				} else {
					const now = new Date()
					const previousValue = await kv.get(['ice-candidate', side])
					const previousNotSoOldItems = previousValue.value
						? (previousValue.value as Array<{
							createdAt: string
							payload: string
						}>).filter(({ createdAt }) =>
							(now.getTime() - new Date(createdAt).getTime()) < 1000 * 60 * 5 // 5 minutes
						)
						: []
					await kv.set(['ice-candidate', side], [...previousNotSoOldItems, {
						createdAt: new Date().toISOString(),
						payload,
					}])
				}
				return createApiResponse({ ok: true })
			}
			return createApiResponse({
				ok: true,
				data: (await kv.get([type, side])).value,
			})
		},
	},
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
