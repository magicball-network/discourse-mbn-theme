import { setOwner } from '@ember/owner';
import { withPluginApi } from 'discourse/lib/plugin-api';

const PLUGIN_ID = 'mbn-theme';
const WALLPAPER_KEY = 'mbn_theme_wallpaper';

class MbnThemeWallpaper {
	api;
	styleRoot;
	wallpaperPreviewed = false;

	constructor(owner, api) {
		setOwner(this, owner);
		this.api = api;
		this.styleRoot = document.body.parentElement.style;
		this.loadLocalStorage();

		let user = api.getCurrentUser();
		if (user) {
			this.loadUserSettings(user);
		} else {
			// Set default
			localStorage.removeItem(WALLPAPER_KEY);
			this.setWallpaper(null, null, null);
		}

		api.onPageChange((url, title) => {
			if (this.wallpaperPreviewed) {
				this.wallpaperPreviewed = false;
				this.loadUserSettings(api.getCurrentUser());
			}
		});

		let _this = this;
		api.modifyClass('component:user-fields/dropdown', {
			pluginId: PLUGIN_ID,
			didUpdateAttrs() {
				if (this.field.id == settings.wallpaper_user_field) {
					_this.wallpaperPreviewed = true;
					_this.alterWallpaper(this.value);
				}
			}
		});
		api.modifyClass('component:user-fields/text', {
			pluginId: PLUGIN_ID,
			didUpdateAttrs() {
				if (this.field.id == settings.wallpaper_alpha_user_field) {
					_this.wallpaperPreviewed = true;
					_this.alterWallpaperAlpha(_this.toPct(this.value));
				} else if (this.field.id == settings.wallpaper_content_alpha_user_field) {
					_this.wallpaperPreviewed = true;
					_this.alterContentAlpha(_this.toPct(this.value));
				}
			}
		});
	}

	loadLocalStorage() {
		let data = localStorage.getItem(WALLPAPER_KEY);
		if (!data) {
			return;
		}
		try {
			let wp = JSON.parse(data);
			this.setWallpaper(wp.wallpaper, wp.alpha, wp.contentAlpha);
		} catch(e) {
			localStorage.removeItem(WALLPAPER_KEY);
		}
	}

	loadUserSettings(currentUser) {
		if (!currentUser) {
			return; 
		}
		this.api.container.lookup('store:main').find('user', currentUser.username).then((user) => {
			let wp = {
				wallpaper: user.user_fields[settings.wallpaper_user_field] || '',
				alpha: this.toPct(user.user_fields[settings.wallpaper_alpha_user_field]),
				contentAlpha: this.toPct(user.user_fields[settings.wallpaper_content_alpha_user_field])
			};
			localStorage.setItem(WALLPAPER_KEY, JSON.stringify(wp));
			this.setWallpaper(wp.wallpaper, wp.alpha, wp.contentAlpha);
		});
	}

	toPct(value) {
		if (typeof value === "string") {
			value = parseInt(value);
			if (!isNaN(value)) {
				return value / 100;
			}		
		}
		return null;
	}

	setWallpaper(wallpaper, wallpaperAlpha, contentAlpha) {	
		console.log('wallpaper set to:', wallpaper, wallpaperAlpha, contentAlpha);
		this.alterWallpaper(wallpaper);
		this.alterWallpaperAlpha(wallpaperAlpha);
		this.alterContentAlpha(contentAlpha);
	}

	alterWallpaper(wallpaper) {
		if (!wallpaper || wallpaper === '') {
			wallpaper = 'waves';
		}
		wallpaper = wallpaper.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
		if (wallpaper === 'none') {
			this.styleRoot.setProperty('--wallpaper', 'none');
		} else {
			this.styleRoot.setProperty('--wallpaper', 'var(--wallpaper-'+wallpaper+')');
		}
	}

	alterWallpaperAlpha(wallpaperAlpha) {
		if (typeof wallpaperAlpha === 'number') {
			this.styleRoot.setProperty('--bgblend-wallpaper-alpha', wallpaperAlpha);
		} else {
			this.styleRoot.removeProperty('--bgblend-wallpaper-alpha');
		}
	}

	alterContentAlpha(contentAlpha) {
		if (typeof contentAlpha === 'number') {
			this.styleRoot.setProperty('--bgblend-content-alpha', contentAlpha);
		} else {
			this.styleRoot.removeProperty('--bgblend-content-alpha');
		}
	}
}

export default {
	name: PLUGIN_ID,
	initialize(owner) {
		withPluginApi('1.34.0', (api) => {
			if (!api.container.lookup("site:main").mobileView) { 
				this.instance = new MbnThemeWallpaper(owner, api);
			}
		});
	}
}

