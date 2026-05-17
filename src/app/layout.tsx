import type { ReactNode } from "react";

import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/assets/logos/app-icon-512.png",
    apple: "/assets/logos/app-icon-512.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  return (
    <html
      lang="fr"
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head />
      <body className={`${fontVars} min-h-screen antialiased`}>
        <TooltipProvider>
          <PreferencesStoreProvider
            themeMode={theme_mode}
            themePreset={theme_preset}
            contentLayout={content_layout}
            navbarStyle={navbar_style}
            font={font}
          >
            {children}
            <Toaster />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.deferredInstallPrompt = null;
                  window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                    window.deferredInstallPrompt = e;
                    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
                  });

                  if ('serviceWorker' in navigator) {
                    window.addEventListener('load', function() {
                      const isLocalDev = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

                      if (isLocalDev) {
                        navigator.serviceWorker.getRegistrations()
                          .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
                          .then(() => {
                            if (!window.caches) return undefined;
                            return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
                          })
                          .catch(() => undefined);
                        return;
                      }

                      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                        .then((registration) => registration.update().catch(() => undefined))
                        .catch(() => undefined);
                    });
                  }
                `,
              }}
            />
          </PreferencesStoreProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
