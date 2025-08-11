import { useState } from 'react'
import beaver from './assets/beaver.svg'
import { ApiResponse, WorkflowDefinition } from 'shared'
import { Button } from './components/ui/button'
import { WorkflowDemo } from './components/WorkflowDemo'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

interface ValidationResult {
  valid: boolean
  errors?: string[]
  message?: string
}

interface WorkflowResult {
  status: string
  result?: any
  error?: string
  validation?: ValidationResult
  stored?: boolean
  storePath?: string
  storeError?: string
}

function App() {
  const [data, setData] = useState<ApiResponse | undefined>()
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | undefined>()

  async function sendRequest() {
    try {
      const req = await fetch(`${SERVER_URL}/hello`)
      const res: ApiResponse = await req.json()
      setData(res)
    } catch (error) {
      console.log(error)
    }
  }

  async function runWorkflow() {
    try {
      // Define a simple workflow using auth and filesystem nodes
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        name: 'Simple Test Workflow',
        version: '1.0.0',
        description: 'Generate token and save to file!',
        workflow: [
          {
            'auth': {
              operation: 'generate_token',
              data: 'test-data',
              'success?': {
                            'filesystem': {
                              operation: 'write',
                              path: '/tmp/workflow-token.txt',
                              content: 'Token generated successfully!'
                            }
                          }
            }
          }
          
        ]
      }

      // First validate the workflow
      const validationResponse = await fetch(`${SERVER_URL}/workflows/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflow)
      })

      const validationResult: ValidationResult = await validationResponse.json()

      // If validation fails, return early with validation errors
      if (!validationResult.valid) {
        setWorkflowResult({
          status: 'validation_failed',
          error: 'Workflow validation failed',
          validation: validationResult
        })
        return
      }

      // If validation passes, execute the workflow
      const response = await fetch(`${SERVER_URL}/workflows/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflow)
      })

      const result: WorkflowResult = await response.json()
      
      // If workflow executed successfully, store it
      if (result.status === 'completed') {
        try {
          const storeResponse = await fetch(`${SERVER_URL}/workflows/store?subfolder=tests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(workflow)
          })
          
          const storeResult = await storeResponse.json()
          console.log('Workflow stored:', storeResult)
          
          // Add store result to the workflow result
          result.stored = storeResult.success
          result.storePath = storeResult.filePath
        } catch (storeError) {
          console.error('Failed to store workflow:', storeError)
          result.storeError = storeError instanceof Error ? storeError.message : 'Unknown store error'
        }
      }
      
      // Prepend validation result to execution result
      result.validation = validationResult
      
      setWorkflowResult(result)
    } catch (error) {
      console.error('Workflow error:', error)
      setWorkflowResult({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6 items-center justify-center min-h-screen">
      <a href="https://github.com/stevedylandev/bhvr" target="_blank">
        <img
          src={beaver}
          className="w-16 h-16 cursor-pointer"
          alt="beaver logo"
        />
      </a>
      <h1 className="text-5xl font-black">bhvr</h1>
      <h2 className="text-2xl font-bold">Bun + Hono + Vite + React</h2>
      <p>A typesafe fullstack monorepo</p>
      <div className='flex items-center gap-4'>
        <Button
          onClick={sendRequest}
        >
          Call API
        </Button>
        <Button
          onClick={runWorkflow}
          variant='outline'
        >
          Run Workflow
        </Button>
        <Button
          variant='secondary'
          asChild
        >
          <a target='_blank' href="https://bhvr.dev">
          Docs
          </a>
        </Button>
      </div>
        {data && (
          <pre className="bg-gray-100 p-4 rounded-md">
            <code>
            Message: {data.message} <br />
            Success: {data.success.toString()}
            </code>
          </pre>
        )}
        
        {workflowResult && (
          <div className="w-full max-w-lg">
            <h3 className="font-bold mb-2">Workflow Result:</h3>
            <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
              <code>
                {JSON.stringify(workflowResult, null, 2)}
              </code>
            </pre>
          </div>
        )}
        
        <div className="w-full mt-8 pt-8 border-t">
          <WorkflowDemo />
        </div>
    </div>
  )
}

export default App
