import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 300000,
})

export const uploadVideo = (file, onProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload-video', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  })
}

export const uploadDocument = (file, onProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload-document', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  })
}

export const startProcessing = () => api.post('/process')
export const getStatus = () => api.get('/status')
export const getAnnotations = () => api.get('/annotations')
export const getAlignment = () => api.get('/alignment')
export const getAnalytics = () => api.get('/analytics')
export const getSlides = () => api.get('/slides')
export const getTranscript = () => api.get('/transcript')
export const trackBehavior = (event) => api.post('/behavior', event)
export const search = (query) => api.post('/search', { query })
export const recommend = (payload) => api.post('/recommend', payload)
export const resetSession = () => api.delete('/reset')

export default api
