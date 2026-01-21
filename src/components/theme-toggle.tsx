import { useTheme } from '@/lib/theme-context'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:bg-slate-700 hover:text-white dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-white"
            >
                <Moon className="w-5 h-5" />
                <span className="sr-only">Toggle Theme</span>
            </Button>
        )
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="text-gray-400 hover:bg-slate-700 hover:text-white dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-white"
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
            <span className="sr-only">Toggle Theme</span>
        </Button>
    )
}
