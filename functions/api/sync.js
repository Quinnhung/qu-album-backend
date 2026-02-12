<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Qu相簿企業版</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
    
    <style>
        [v-cloak] { display: none; }
        /* 畫筆游標 (SVG) */
        .cursor-pen { cursor: none; } /* Canvas 控制游標 */
        .watermark { position: fixed; bottom: 10px; right: 10px; font-size: 0.7rem; color: rgba(0,0,0,0.2); pointer-events: none; z-index: 9999; }
        .folder-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        /* 動畫效果 */
        .fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
        .fade-enter-from, .fade-leave-to { opacity: 0; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* 隱藏滾動條 */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800 font-sans antialiased">

<div id="app" v-cloak>
    <div class="watermark">Qu Album Enterprise</div>

    <div v-if="isPortalMode" class="fixed inset-0 z-[200] bg-gray-100 flex flex-col items-center justify-center p-4">
        <div class="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-200">
            <h1 class="text-3xl font-bold text-gray-800 mb-6 flex items-center justify-center">
                <i class="fa-solid fa-server text-blue-600 mr-3"></i> 企業相簿總管
            </h1>
            
            <div v-if="!portalAuth" class="flex flex-col space-y-4">
                <p class="text-center text-gray-500 mb-2">請輸入 IT 管理密碼以存取索引</p>
                <input type="password" v-model="portalInput" placeholder="Password" class="border p-3 rounded text-center text-lg focus:ring-2 focus:ring-blue-500 outline-none" @keyup.enter="verifyPortal">
                <button @click="verifyPortal" class="bg-gray-800 text-white py-3 rounded hover:bg-black transition font-bold shadow-md">驗證身份</button>
                <p v-if="portalError" class="text-red-500 text-center animate-pulse"><i class="fa-solid fa-circle-exclamation mr-1"></i> 密碼錯誤</p>
            </div>

            <div v-else>
                <div class="flex justify-between items-center mb-4 border-b pb-2">
                    <span class="text-gray-500 text-sm">已索引單位: {{ units.length }}</span>
                    <button @click="exitPortal" class="text-sm text-red-500 hover:underline">登出</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
                    <div v-for="unit in units" :key="unit.uuid" @click="switchUnit(unit.uuid)" 
                         class="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition flex justify-between items-center group bg-gray-50">
                        <div>
                            <div class="font-bold text-lg text-gray-800">{{ unit.name }}</div>
                            <div class="text-sm text-gray-500"><i class="fa-solid fa-user-tag mr-1"></i> {{ unit.manager }}</div>
                        </div>
                        <i class="fa-solid fa-arrow-right-to-bracket text-gray-300 group-hover:text-blue-500 text-xl"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <template v-else>
        <div v-if="loading" class="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
            <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
            <p class="text-gray-500 animate-pulse">讀取相簿櫃中...</p>
        </div>

        <div v-else-if="error" class="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 p-4 text-center z-40">
            <div v-if="error === 'HOME'" class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-200">
                <div class="mb-6 flex justify-center"><div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center"><i class="fa-solid fa-camera-retro text-4xl text-blue-600"></i></div></div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Qu相簿入口</h2>
                <div class="flex flex-col space-y-3 mt-6">
                    <input type="text" v-model="inputDeploymentId" placeholder="輸入 UUID" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono text-lg">
                    <button @click="openById" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition shadow-md hover:shadow-lg">進入</button>
                </div>
                <p class="mt-6 text-xs text-gray-400">請向管理員索取相簿 ID</p>
            </div>
            <div v-else>
                <i class="fa-solid fa-triangle-exclamation text-6xl text-red-400 mb-4"></i>
                <h2 class="text-2xl font-bold text-gray-700 mb-2">存取拒絕</h2>
                <p class="text-gray-500 max-w-md bg-white p-4 rounded border border-red-100 shadow-sm">{{ error }}</p>
                <button @click="goHomeRoot" class="mt-6 text-blue-600 hover:underline">回到首頁</button>
            </div>
        </div>

        <div v-else class="min-h-screen flex flex-col">
            <nav class="bg-white shadow sticky top-0 z-30">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center cursor-pointer" @click="goHome">
                            <i class="fa-solid fa-camera-retro text-blue-600 text-2xl mr-2"></i>
                            <span class="font-bold text-xl tracking-tight">{{ sysInfo.title || 'Qu Album' }}</span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <button @click="copyShareLink" class="text-gray-500 hover:text-blue-600 transition" title="複製連結"><i class="fa-solid fa-share-nodes text-lg"></i></button>
                        </div>
                    </div>
                </div>
            </nav>

            <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                <div v-if="breadcrumbs.length > 0" class="flex items-center space-x-2 text-sm mb-6 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
                    <button @click="goHome" class="text-gray-500 hover:text-blue-600 flex items-center px-2 py-1 rounded hover:bg-gray-100"><i class="fa-solid fa-house"></i></button>
                    <template v-for="(crumb, index) in breadcrumbs" :key="crumb.id">
                        <span class="text-gray-300">/</span>
                        <button @click="navigateBreadcrumb(index)" :class="index === breadcrumbs.length - 1 ? 'font-bold text-gray-800' : 'text-gray-500 hover:text-blue-600'" class="px-2 py-1 rounded hover:bg-gray-100 transition">{{ crumb.name }}</button>
                    </template>
                </div>

                <div class="animate-fade-in">
                    <div v-if="viewMode === 'bookshelf'">
                        <h2 class="text-2xl font-bold mb-4 border-l-4 border-blue-500 pl-3">相簿列表</h2>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <div v-for="album in albums" :key="album.id" @click="enterFolder(album)"
                                 class="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 transform hover:-translate-y-1">
                                <div class="aspect-w-4 aspect-h-3 bg-gray-200 relative overflow-hidden">
                                    <img :src="album.cover || 'https://via.placeholder.com/400x300?text=No+Cover'" class="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700">
                                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></div>
                                    <div v-if="album.pwd" class="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                                        <i class="fa-solid fa-lock mr-1"></i> 上鎖
                                    </div>
                                </div>
                                <div class="p-4">
                                    <h3 class="font-bold text-lg text-gray-800 truncate group-hover:text-blue-600">{{ album.name }}</h3>
                                    <div class="flex justify-between items-center mt-2 text-sm text-gray-500">
                                        <span><i class="fa-regular fa-folder-open mr-1"></i> 進入相簿</span>
                                        <i class="fa-solid fa-arrow-right"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else>
                        <div v-if="currentFolders.length > 0" class="mb-8">
                            <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">資料夾</h3>
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                <div v-for="folder in currentFolders" :key="folder.id" @click="enterFolder(folder)"
                                     class="folder-card bg-white p-4 rounded-xl border border-gray-200 cursor-pointer transition flex flex-col items-center justify-center text-center h-32 relative group">
                                    <div class="relative">
                                         <i class="fa-solid fa-folder text-4xl text-yellow-400 mb-2 group-hover:text-yellow-500 transition"></i>
                                         <i v-if="folder.pwd" class="fa-solid fa-lock text-xs absolute -right-1 -bottom-0 text-red-500 bg-white rounded-full p-0.5 border border-red-100"></i>
                                    </div>
                                    <span class="text-sm font-medium text-gray-700 line-clamp-2">{{ folder.name }}</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="currentFiles.length > 0">
                            <div class="flex justify-between items-end mb-3">
                                <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider">照片 ({{ currentFiles.length }})</h3>
                                <button @click="downloadCurrentFolder" class="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-full hover:bg-gray-700 transition flex items-center shadow-md">
                                    <i class="fa-solid fa-download mr-1"></i> 打包此層
                                </button>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
                                <div v-for="(file, index) in currentFiles" :key="file.id" @click="openLightbox(index)"
                                     class="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition">
                                    <img :src="file.cover" loading="lazy" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">
                                    <span v-if="file.mime === 'v'" class="absolute top-2 right-2 text-white drop-shadow-md"><i class="fa-solid fa-video"></i></span>
                                </div>
                            </div>
                        </div>

                        <div v-if="currentFolders.length === 0 && currentFiles.length === 0" class="text-center py-20 opacity-50">
                            <i class="fa-regular fa-folder-open text-6xl mb-4 text-gray-300"></i>
                            <p>此資料夾是空的</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <transition name="fade">
            <div v-if="auth.required" class="fixed inset-0 z-[60] bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform transition-all scale-100 border border-gray-100">
                    <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-lock text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">
                        {{ auth.type === 'global' ? '全站鎖定' : '相簿上鎖' }}
                    </h3>
                    <p class="text-gray-500 text-sm mb-6">
                        {{ auth.type === 'global' ? '請輸入全站存取密碼' : '此資料夾受密碼保護' }}
                    </p>
                    <form @submit.prevent="verifyPassword">
                        <input type="password" v-model="auth.input" ref="pwdInput" placeholder="輸入密碼..." 
                               class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-center mb-4 tracking-widest text-lg">
                        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md">
                            {{ auth.verifying ? '驗證中...' : '解鎖' }}
                        </button>
                        <p v-if="auth.error" class="text-red-500 text-xs mt-3 animate-pulse font-bold">
                            <i class="fa-solid fa-circle-exclamation mr-1"></i> 密碼錯誤
                        </p>
                    </form>
                    <button v-if="auth.type === 'folder'" @click="cancelAuth" class="mt-4 text-gray-400 text-sm hover:text-gray-600 underline">取消</button>
                </div>
            </div>
        </transition>

        <div v-if="showLightbox" class="fixed inset-0 z-[100] bg-black/95 flex flex-col" @keydown.esc="closeLightbox" tabindex="0">
            <div class="flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/80 to-transparent z-50">
                <div class="flex items-center space-x-4">
                    <span class="font-bold font-mono">{{ currentPhotoIndex + 1 }} / {{ currentFiles.length }}</span>
                    <button @click="toggleDrawing" :class="isDrawingMode ? 'bg-blue-600 border-transparent' : 'bg-gray-800 border-gray-600'" class="px-3 py-1.5 rounded-full text-sm border flex items-center transition transition-all"><i class="fa-solid fa-pen-nib mr-2"></i> 標記</button>
                    
                    <div v-if="isDrawingMode" class="flex space-x-2 animate-fade-in items-center pl-2 border-l border-gray-700">
                        <template v-for="color in colorPalette" :key="color.hex">
                            <button @click="penColor = color.hex" 
                                    class="w-6 h-6 rounded-full border-2 transition box-content"
                                    :class="[color.bg, penColor === color.hex ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100']">
                            </button>
                        </template>
                        <button @click="clearCanvas" class="text-xs bg-gray-800 px-2 py-1 rounded ml-2 hover:bg-gray-700 text-gray-300"><i class="fa-solid fa-trash-can mr-1"></i> 清除</button>
                    </div>
                </div>
                <button @click="closeLightbox" class="w-10 h-10 rounded-full bg-gray-800 hover:bg-red-500 flex items-center justify-center transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            <div class="flex-1 relative flex items-center justify-center overflow-hidden bg-black select-none w-full h-full">
                <canvas ref="drawCanvas" v-show="isDrawingMode" class="absolute inset-0 z-20 touch-none w-full h-full object-contain"
                    :style="{ cursor: isDrawingMode ? 'url(' + penCursorUrl + ') 0 24, crosshair' : 'default' }"
                    @mousedown="startDraw" @mousemove="drawing" @mouseup="stopDraw" @mouseout="stopDraw" @touchstart="startDraw" @touchmove="drawing" @touchend="stopDraw"></canvas>
                
                <img v-if="currentPhoto.mime === 'i'" :src="currentPhoto.url" class="max-h-full max-w-full object-contain z-10 pointer-events-none">
                <video v-else :src="getProxyUrl(currentPhoto.url)" controls autoplay class="max-h-full max-w-full z-10"></video>
                
                <button v-if="!isDrawingMode" @click="prevPhoto" class="absolute left-4 z-30 w-12 h-12 rounded-full bg-black/50 hover:bg-white/20 text-white flex items-center justify-center transition"><i class="fa-solid fa-chevron-left text-2xl"></i></button>
                <button v-if="!isDrawingMode" @click="nextPhoto" class="absolute right-4 z-30 w-12 h-12 rounded-full bg-black/50 hover:bg-white/20 text-white flex items-center justify-center transition"><i class="fa-solid fa-chevron-right text-2xl"></i></button>
            </div>
        </div>
    </template>
</div>

<script>
    const { createApp, ref, computed, onMounted, nextTick } = Vue;
    createApp({
        setup() {
            // --- State ---
            const loading = ref(true);
            const error = ref(null);
            const inputDeploymentId = ref('');
            const sysInfo = ref({});
            const albums = ref([]);
            
            // Portal State
            const isPortalMode = ref(false);
            const portalAuth = ref(false);
            const portalInput = ref('');
            const portalError = ref(false);
            const units = ref([]);
            const masterHash = ref('');

            // Auth State
            const auth = ref({ required: false, type: '', target: null, input: '', error: false, verifying: false });

            // Navigation
            const viewMode = ref('bookshelf');
            const breadcrumbs = ref([]);
            const currentNode = ref(null);

            // Lightbox & Drawing
            const showLightbox = ref(false);
            const currentPhotoIndex = ref(0);
            const isDrawingMode = ref(false);
            const penColor = ref('#ef4444');
            const colorPalette = [
                { hex: '#ef4444', name: 'Red', bg: 'bg-red-500' },
                { hex: '#eab308', name: 'Yellow', bg: 'bg-yellow-500' },
                { hex: '#22c55e', name: 'Green', bg: 'bg-green-500' },
                { hex: '#3b82f6', name: 'Blue', bg: 'bg-blue-500' },
                { hex: '#ffffff', name: 'White', bg: 'bg-white' },
            ];
            const drawCanvas = ref(null);
            const ctx = ref(null);
            const isPainting = ref(false);
            const penCursorUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.5));"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path></svg>';

            // --- Helpers ---
            const currentFolders = computed(() => currentNode.value?.children?.filter(c => c.type === 'folder') || []);
            const currentFiles = computed(() => currentNode.value?.children?.filter(c => c.type === 'file') || []);
            const currentPhoto = computed(() => currentFiles.value[currentPhotoIndex.value] || {});

            async function sha256(message) {
                const msgBuffer = new TextEncoder().encode(message);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
            }

            const getProxyUrl = (u) => `/api/proxy?url=${encodeURIComponent(u)}`;

            // --- Portal Logic ---
            const checkPortal = async () => {
                const params = new URLSearchParams(window.location.search);
                if (params.get('portal') === '1') {
                    isPortalMode.value = true;
                    try {
                        // 載入 Master Index
                        const res = await fetch(`/api/albums?id=_MASTER_INDEX`);
                        if(res.ok) {
                            const data = await res.json();
                            masterHash.value = data.sys.password; // IT 密碼雜湊
                            units.value = data.units || [];
                        } else {
                            alert("Master Index Not Found");
                        }
                    } catch(e) { console.error("Portal Load Error", e); }
                }
            };

            const verifyPortal = async () => {
                const inputHash = await sha256(portalInput.value);
                if (inputHash === masterHash.value) {
                    portalAuth.value = true;
                    portalError.value = false;
                } else {
                    portalError.value = true;
                }
            };

            const switchUnit = (uuid) => {
                // 切換到一般模式檢視該單位
                window.location.href = `?id=${uuid}`;
            };
            
            const exitPortal = () => {
                window.location.href = window.location.pathname; // 回首頁 (無參數)
            };

            // --- Main Logic ---
            const fetchData = async (id) => {
                try {
                    const res = await fetch(`/api/albums?id=${id}`);
                    if (!res.ok) throw new Error('讀取失敗');
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    sysInfo.value = data.sys;
                    albums.value = data.albums;
                    if (sysInfo.value.password) triggerAuth('global');
                } catch (err) { error.value = err.message; } finally { loading.value = false; }
            };

            const enterFolder = (folder) => {
                if (folder.pwd && folder.password) triggerAuth('folder', folder);
                else actuallyEnterFolder(folder);
            };

            const actuallyEnterFolder = (folder) => {
                currentNode.value = folder;
                breadcrumbs.value.push({ id: folder.id, name: folder.name, node: folder });
                viewMode.value = 'explorer';
            };

            // --- Auth Logic (SHA-256) ---
            const triggerAuth = (type, target = null) => {
                auth.value = { required: true, type, target, input: '', error: false, verifying: false };
                nextTick(() => { document.querySelector('input[type="password"]')?.focus(); });
            };

            const verifyPassword = async () => {
                auth.value.verifying = true;
                const input = String(auth.value.input).trim();
                let hashedInput = '';
                if(input) hashedInput = await sha256(input);

                let correctHash = '';
                if (auth.value.type === 'global') {
                    correctHash = sysInfo.value.password || '';
                } else if (auth.value.type === 'folder') {
                    correctHash = auth.value.target.password || '';
                }

                if (hashedInput === correctHash) {
                    const target = auth.value.target;
                    auth.value.required = false; 
                    if (auth.value.type === 'folder' && target) {
                        actuallyEnterFolder(target);
                    }
                } else {
                    auth.value.error = true;
                    auth.value.input = '';
                }
                auth.value.verifying = false;
            };
            const cancelAuth = () => { auth.value.required = false; };

            // --- Lifecycle ---
            onMounted(async () => {
                await checkPortal(); // 1. 檢查是否為入口模式
                
                if (!isPortalMode.value) {
                    const id = new URLSearchParams(window.location.search).get('id');
                    if (!id) { loading.value = false; error.value = "HOME"; return; }
                    await fetchData(id); // 2. 不是入口模式，則讀取相簿
                } else {
                    loading.value = false; 
                }

                window.addEventListener('keydown', (e) => {
                    if (showLightbox.value) {
                        if (e.key === 'ArrowRight') nextPhoto();
                        if (e.key === 'ArrowLeft') prevPhoto();
                        if (e.key === 'Escape') closeLightbox();
                    }
                });
                window.addEventListener('resize', () => { if (isDrawingMode.value) initCanvas(); });
            });

            // --- Interactions ---
            const openById = () => { if(inputDeploymentId.value) window.location.href = `?id=${inputDeploymentId.value.trim()}`; };
            const goHomeRoot = () => { window.location.href = window.location.pathname; };
            const copyShareLink = () => { navigator.clipboard.writeText(window.location.href).then(() => alert('已複製連結')); };
            const goHome = () => { viewMode.value = 'bookshelf'; breadcrumbs.value = []; currentNode.value = null; };
            const navigateBreadcrumb = (idx) => { const t = breadcrumbs.value[idx]; currentNode.value = t.node; breadcrumbs.value = breadcrumbs.value.slice(0, idx + 1); };
            
            // Lightbox
            const openLightbox = (idx) => { currentPhotoIndex.value = idx; showLightbox.value = true; isDrawingMode.value = false; };
            const closeLightbox = () => { showLightbox.value = false; clearCanvas(); };
            const nextPhoto = () => { currentPhotoIndex.value = (currentPhotoIndex.value + 1) % currentFiles.value.length; clearCanvas(); };
            const prevPhoto = () => { currentPhotoIndex.value = (currentPhotoIndex.value - 1 + currentFiles.value.length) % currentFiles.value.length; clearCanvas(); };
            
            // Drawing
            const toggleDrawing = async () => { isDrawingMode.value = !isDrawingMode.value; if(isDrawingMode.value) { await nextTick(); initCanvas(); } };
            
            const initCanvas = () => { 
                const c = drawCanvas.value; if(!c) return; 
                const rect = c.getBoundingClientRect();
                c.width = rect.width; c.height = rect.height; 
                ctx.value = c.getContext('2d'); 
                ctx.value.lineCap='round'; ctx.value.lineJoin='round'; ctx.value.lineWidth=5; 
            };

            const getPos = (e) => {
                 const c = drawCanvas.value; if(!c) return {x:0, y:0};
                 const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
                 const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
                 const rect = c.getBoundingClientRect();
                 return { x: clientX - rect.left, y: clientY - rect.top };
            };

            const startDraw = (e) => { if(!isDrawingMode.value) return; isPainting.value = true; const {x,y} = getPos(e); ctx.value.strokeStyle = penColor.value; ctx.value.beginPath(); ctx.value.moveTo(x,y); };
            const drawing = (e) => { if(!isPainting.value) return; e.preventDefault(); const {x,y} = getPos(e); ctx.value.lineTo(x,y); ctx.value.stroke(); };
            const stopDraw = () => { isPainting.value = false; if(ctx.value) ctx.value.closePath(); };
            const clearCanvas = () => { if(ctx.value) ctx.value.clearRect(0,0,drawCanvas.value.width, drawCanvas.value.height); };
            
            const downloadCurrentFolder = async () => {
                const zip = new JSZip();
                const files = currentFiles.value;
                if(files.length===0) return alert('無照片');
                alert(`打包中...`);
                try {
                    await Promise.all(files.map(async (p) => {
                        try { const res = await fetch(getProxyUrl(p.url)); if(res.ok) zip.file(p.name, await res.blob()); } catch(e){}
                    }));
                    saveAs(await zip.generateAsync({type:"blob"}), `${currentNode.value.name}.zip`);
                } catch(e) { alert('下載失敗'); }
            };

            return {
                loading, error, inputDeploymentId, sysInfo, albums, viewMode, breadcrumbs, currentFolders, currentFiles, currentPhoto,
                goHome, enterFolder, navigateBreadcrumb, openById, goHomeRoot, copyShareLink,
                showLightbox, currentPhotoIndex, openLightbox, closeLightbox, nextPhoto, prevPhoto,
                isDrawingMode, penColor, colorPalette, drawCanvas, toggleDrawing, startDraw, drawing, stopDraw, clearCanvas,
                getProxyUrl, downloadCurrentFolder, auth, verifyPassword, cancelAuth, penCursorUrl,
                isPortalMode, portalAuth, portalInput, portalError, units, verifyPortal, switchUnit, exitPortal
            };
        }
    }).mount('#app');
</script>
</body>
</html>
