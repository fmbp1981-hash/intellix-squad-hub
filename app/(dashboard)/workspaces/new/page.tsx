import { WorkspaceForm } from '@/components/workspace/WorkspaceForm'

export default function NewWorkspacePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Novo Workspace</h1>
      <WorkspaceForm />
    </div>
  )
}
