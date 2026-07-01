import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 프로젝트 사이트 경로. 레포명이 바뀌면 여기도 맞춰야 함.
// gh-pages: https://gahyeonnni.github.io/roomescape-review-search/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/roomescape-review-search/',
  plugins: [react()],
})