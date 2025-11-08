// File Processor UI Node - File upload and processing
import { UINode } from '@workscript/engine';
export class FileProcessorUINode extends UINode {
    metadata = {
        id: 'ui-file-processor',
        name: 'File Processor UI',
        description: 'Creates file upload interfaces with processing capabilities',
        version: '1.0.0',
        category: 'ui',
        renderMode: 'component',
        inputs: ['acceptedTypes', 'maxSize', 'multiple'],
        outputs: ['files_selected', 'files_processed', 'processing_error']
    };
    async prepareRenderData(context, config) {
        return {
            acceptedTypes: config.acceptedTypes || ['.txt', '.json', '.csv'],
            maxSize: config.maxSize || 5 * 1024 * 1024, // 5MB default
            multiple: config.multiple || false,
            processOnUpload: config.processOnUpload || false,
            loading: context.state.fileProcessing || false,
            files: context.state.selectedFiles || [],
            dragActive: context.state.dragActive || false
        };
    }
    async getEdges(context, config) {
        if (context.state.filesSelected) {
            context.state.filesSelected = false;
            return {
                files_selected: () => ({
                    files: context.state.selectedFiles,
                    count: context.state.selectedFiles?.length || 0
                })
            };
        }
        if (context.state.processingError) {
            const error = context.state.processingError;
            context.state.processingError = null;
            return {
                error: () => ({ error })
            };
        }
        return {
            ready: () => ({ status: 'ready_for_files' })
        };
    }
    getComponentName() {
        return 'FileProcessor';
    }
    handleInteraction(event, context) {
        switch (event.type) {
            case 'files_selected':
                context.state.selectedFiles = event.data.files;
                context.state.filesSelected = true;
                break;
            case 'processing_started':
                context.state.fileProcessing = true;
                break;
            case 'processing_completed':
                context.state.fileProcessing = false;
                context.state.processedData = event.data.result;
                break;
            case 'processing_error':
                context.state.fileProcessing = false;
                context.state.processingError = event.data.error;
                break;
        }
        super.handleInteraction(event, context);
    }
}
