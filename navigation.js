// shared/navigation.js - Injected into all pages
const Navigation = {
    render: () => {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        const navItems = [
            { id: 'home', label: 'Dashboard', icon: '⌂', href: 'index.html', active: currentPage === 'index.html' },
            { id: 'news', label: 'News', icon: '📰', href: 'news.html', active: currentPage === 'news.html' },
            { id: 'services', label: 'Services', icon: '⚙️', href: 'services.html', active: currentPage === 'services.html' },
            { id: 'headman', label: 'Headman AI', icon: '🧠', href: 'headman.html', active: currentPage === 'headman.html' }
        ];

        return `
            <nav class="fixed left-0 top-0 h-full w-16 md:w-64 bg-gray-900 border-r border-gray-800 z-50 flex flex-col">
                <div class="p-4 border-b border-gray-800">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-xl">₿</div>
                        <span class="hidden md:block font-bold text-lg">CryptoCC</span>
                    </div>
                </div>
                
                <div class="flex-1 py-4 space-y-1">
                    ${navItems.map(item => `
                        <a href="${item.href}" 
                           class="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all ${item.active ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}">
                            <span class="text-xl">${item.icon}</span>
                            <span class="hidden md:block font-medium">${item.label}</span>
                            ${item.active ? '<span class="hidden md:block ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full"></span>' : ''}
                        </a>
                    `).join('')}
                </div>
                
                <div class="p-4 border-t border-gray-800">
                    <div class="flex items-center gap-3 text-xs text-gray-500">
                        <span class="w-2 h-2 bg-green-500 rounded-full live-pulse"></span>
                        <span class="hidden md:block">System Online</span>
                    </div>
                    <div class="hidden md:block mt-2 text-[10px] text-gray-600" id="nav-version">v3.2.1</div>
                </div>
            </nav>
        `;
    },

    init: () => {
        const navContainer = document.createElement('div');
        navContainer.innerHTML = Navigation.render();
        document.body.insertBefore(navContainer.firstElementChild, document.body.firstChild);
        
        // Add padding to main content
        document.querySelector('main')?.classList.add('md:ml-64', 'ml-16');
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', Navigation.init);
