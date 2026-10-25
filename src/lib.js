import MindmapApp from './App.vue'
import MindmapViewer from './components/MindmapViewer.vue'
// استایل اسکوپ‌شده ویور؛ عمداً base.css (سراسری دمو) وارد پکیج نمی‌شود
// تا روی body/html و layout پروژه میزبان اثر نگذارد.
import './styles/viewer.css'
import '@fontsource-variable/vazirmatn'

export { MindmapApp, MindmapViewer }
export default MindmapApp
