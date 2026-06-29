# Teaching Checklist: Responsive Redesign of 3D Birthday Web App

This checklist tracks your understanding of the problems, solutions, and concepts related to the mobile responsiveness optimization for the 3D Birthday Web App.

## 1. Understanding the Problem
- [x] **Dynamic Camera Clipping (Three.js)**: Why did the 3D scene (island, cake, cats) look zoomed-in or cut off on mobile?
- [x] **Transform Override Clashes**: How did JS inline transforms override CSS media queries, causing off-center text overlay clipping?
- [x] **UI Component Overlap**: Why did the countdown timer, time controls, share, and music buttons overlap on a narrow 390px viewport (iPhone 13)?

## 2. Understanding the Solution & Design Decisions
- [x] **Dynamic FOV Scaling**: How do we use the aspect ratio (width/height) to scale PerspectiveCamera's FOV on portrait viewports?
- [x] **Responsive JS Transforms**: How do we adjust the `transform` string in JavaScript to center overlays on mobile while keeping desktop alignment?
- [x] **Layout Restructuring**: Why did we rearrange the control buttons horizontally at the top, move the countdown timer down, and hide the time presets/chapter dots?

## 3. Broader Context & Best Practices
- [x] **Three.js Mobile Optimization**: Why antialiasing is disabled on mobile and how pixel ratio clamping preserves performance.
- [x] **Viewport & Touch Interactions**: How touch events compare to mouse scrolls in scroll-based storytellers.
