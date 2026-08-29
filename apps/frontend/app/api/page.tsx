import Link from "next/link"
import apiSchema from "../../../../packages/api-docs/openapi.json"

type Schema = {
  $ref?: string
  properties?: Record<string, { description?: string }>
}

type Parameter = {
  $ref?: string
  name?: string
  in?: string
  required?: boolean
}

type Response = {
  $ref?: string
  description?: string
}

type Operation = {
  tags?: string[]
  summary?: string
  description?: string
  security?: unknown[]
  parameters?: Parameter[]
  requestBody?: {
    content?: Record<string, { schema?: Schema }>
  }
  responses?: Record<string, Response>
}

type ApiSchema = {
  info: { title: string; version: string; description?: string }
  servers: Array<{ url: string }>
  paths: Record<string, Record<string, Operation>>
  components: {
    schemas: Record<string, Schema>
    parameters: Record<string, Parameter>
    responses: Record<string, Response>
  }
}

const document = apiSchema as ApiSchema
const methods = ["get", "post", "put", "patch", "delete"]
const schemaUrl = `${document.servers[0]?.url ?? ""}/openapi.json`

function requestFields(operation: Operation) {
  const content = operation.requestBody?.content
  const schema = content && Object.values(content)[0]?.schema
  if (!schema) {
    return []
  }
  const name = schema.$ref?.split("/").pop()
  const resolved = name ? document.components.schemas[name] : schema
  return Object.entries(resolved?.properties ?? {}).map(([name, property]) => ({
    name,
    description: property.description,
  }))
}

function resolveParameter(parameter: Parameter) {
  const name = parameter.$ref?.split("/").pop()
  return name ? (document.components.parameters[name] ?? parameter) : parameter
}

function responseDescription(response: Response) {
  const name = response.$ref?.split("/").pop()
  return (name ? document.components.responses[name] : response).description ?? "响应"
}

function responseTone(status: string) {
  if (status.startsWith("2")) return "border-emerald-400"
  if (status.startsWith("4")) return "border-amber-400"
  return "border-rose-400"
}

const endpoints = Object.entries(document.paths).flatMap(([path, item]) =>
  methods.flatMap((method) => {
    const operation = item[method]
    return operation ? [{ method, path, operation }] : []
  })
)

const methodColor: Record<string, string> = {
  get: "bg-emerald-100 text-emerald-800",
  post: "bg-blue-100 text-blue-800",
  put: "bg-amber-100 text-amber-800",
  patch: "bg-violet-100 text-violet-800",
  delete: "bg-rose-100 text-rose-800",
}

export default function ApiPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-indigo-600">OPENAPI 3.1</p>
            <h1 className="text-2xl font-bold">{document.info.title}</h1>
          </div>
          <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            返回首页
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl bg-slate-900 p-7 text-white shadow-sm">
          <p className="max-w-2xl text-slate-300">{document.info.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1">v{document.info.version}</span>
            <code className="rounded bg-black/20 px-3 py-1">{document.servers[0]?.url}</code>
            <a className="rounded bg-indigo-500 px-3 py-1 font-medium hover:bg-indigo-400" href={schemaUrl}>
              查看原始 Schema
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-5">
          {endpoints.map(({ method, path, operation }) => {
            const fields = requestFields(operation)
            const parameters = operation.parameters?.map(resolveParameter) ?? []
            const requiresAuth = operation.security?.length !== 0
            return (
              <article key={`${method}-${path}`} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded px-2.5 py-1 text-xs font-bold uppercase ${methodColor[method]}`}>
                    {method}
                  </span>
                  <code className="break-all font-mono text-sm font-semibold">{path}</code>
                  {operation.tags?.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="mt-4 text-lg font-semibold">{operation.summary}</h2>
                {operation.description && (
                  <p className="mt-2 text-sm leading-6 text-slate-600">{operation.description}</p>
                )}
                <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 text-sm md:grid-cols-3">
                  <div>
                    <dt className="font-medium text-slate-500">认证</dt>
                    <dd className="mt-1">{requiresAuth ? "DeviceToken" : "无需认证"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">参数</dt>
                    <dd className="mt-2">
                      {parameters.length ? (
                        <ul className="space-y-1.5">
                          {parameters.map((parameter) => (
                            <li
                              key={`${parameter.in}-${parameter.name}`}
                              className="flex flex-wrap items-center gap-1.5"
                            >
                              <code className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                                {parameter.in}
                              </code>
                              <code className="font-mono text-slate-800">{parameter.name}</code>
                              {parameter.required && <span className="text-xs text-rose-600">必填</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">请求字段</dt>
                    <dd className="mt-2">
                      {fields.length ? (
                        <ul className="space-y-1.5">
                          {fields.map((field) => (
                            <li key={field.name} className="flex flex-wrap items-baseline gap-1.5 text-slate-700">
                              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800">
                                {field.name}
                              </code>
                              {field.description && (
                                <span className="text-xs leading-5 text-slate-500">{field.description}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
                <ul className="mt-4 space-y-2">
                  {Object.entries(operation.responses ?? {}).map(([status, response]) => (
                    <li key={status} className={`flex items-start gap-2  pl-3 text-sm text-slate-600`}>
                      <code
                        className={`shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 border-l-2 ${responseTone(status)}`}
                      >
                        {status}
                      </code>
                      <span className="leading-5">{responseDescription(response)}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
