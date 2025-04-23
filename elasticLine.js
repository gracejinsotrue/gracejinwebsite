

// // Enhanced Elastic Lines Effect with text integration
// document.addEventListener('DOMContentLoaded', function () {
//     // Only implement on the home page
//     if (!document.querySelector('.intro-text')) return;

//     // Get the intro text section
//     const introText = document.querySelector('.intro-text');

//     // Get all the relevant text elements
//     const textElements = introText.querySelectorAll('h2, p');



//     // Create elastic lines between text elements
//     insertElasticLines(textElements, introText);
// });

// function insertElasticLines(textElements, parentElement) {
//     // Space to add before the first and after the last elastic line
//     const margin = 20;

//     // Create the container to hold all elastic lines
//     const linesContainer = document.createElement('div');
//     linesContainer.className = 'elastic-lines-container';
//     linesContainer.style.position = 'absolute';
//     linesContainer.style.top = '0';
//     linesContainer.style.left = '0';
//     linesContainer.style.width = '100%';
//     linesContainer.style.height = '100%';
//     linesContainer.style.pointerEvents = 'none'; // Don't block interaction with text
//     linesContainer.style.zIndex = '1';

//     // Set parent to relative positioning if it's not already
//     const parentPosition = window.getComputedStyle(parentElement).position;
//     if (parentPosition === 'static') {
//         parentElement.style.position = 'relative';
//     }

//     // Add the container to the parent
//     parentElement.appendChild(linesContainer);

//     // The canvas for drawing the lines
//     const canvas = document.createElement('canvas');
//     canvas.id = 'elastic-lines-canvas';
//     canvas.className = 'elastic-canvas';
//     canvas.style.position = 'absolute';
//     canvas.style.top = '0';
//     canvas.style.left = '0';
//     canvas.style.width = '85%'; //MODIFY THIS TO SHORTEN
//     canvas.style.height = '100%';
//     canvas.style.pointerEvents = 'auto'; // Capture mouse events

//     // Add the canvas to the container
//     linesContainer.appendChild(canvas);

//     // Calculate line positions based on text element positions
//     const linePositions = [];

//     // Add a line before the first text element
//     linePositions.push(textElements[0].offsetTop - margin);

//     // Add lines between text elements
//     for (let i = 0; i < textElements.length - 1; i++) {
//         const currentBottom = textElements[i].offsetTop + textElements[i].offsetHeight;
//         const nextTop = textElements[i + 1].offsetTop;
//         const midpoint = (currentBottom + nextTop) / 2;
//         linePositions.push(midpoint);
//     }

//     // Add a line after the last text element
//     const lastElement = textElements[textElements.length - 1];
//     linePositions.push(lastElement.offsetTop + lastElement.offsetHeight + margin);

//     // Initialize the elastic lines
//     initElasticLines(canvas, linePositions);
// }

// function initElasticLines(canvas, linePositions) {
//     if (!canvas) return;

//     const ctx = canvas.getContext('2d');

//     // Set canvas dimensions to match the parent container
//     function resizeCanvas() {
//         const container = canvas.parentElement;
//         canvas.width = container.offsetWidth;
//         canvas.height = container.offsetHeight;
//     }

//     // Initial resize
//     resizeCanvas();

//     // Resize on window resize
//     window.addEventListener('resize', function () {
//         resizeCanvas();
//         // Reinitialize points on resize
//         initializePoints();
//     });

//     // Line properties
//     const lineColor = 'rgba(150, 117, 139, 0.94)';
//     const lineWidth = 2;

//     // Elastic effect parameters
//     const maxDisplacement = 20;
//     const influenceDistance = 50;
//     const springFactor = 0.01;
//     const damping = 0.7;

//     // Points array to create the elastic effect
//     const numPoints = 100;
//     const linesPoints = [];
//     const spacing = canvas.width / (numPoints - 1);

//     // Initialize points for each line
//     function initializePoints() {
//         // Clear the previous points
//         linesPoints.length = 0;

//         for (let lineIndex = 0; lineIndex < linePositions.length; lineIndex++) {
//             const baseY = linePositions[lineIndex];
//             const linePoints = [];

//             for (let i = 0; i < numPoints; i++) {
//                 linePoints.push({
//                     x: i * spacing,
//                     y: baseY,
//                     targetY: baseY,
//                     velocity: 0,
//                     baseY: baseY
//                 });
//             }

//             linesPoints.push(linePoints);
//         }
//     }

//     // Initial points setup
//     initializePoints();

//     // Mouse position tracking
//     let mouseX = -100, mouseY = -100;

//     canvas.addEventListener('mousemove', function (e) {
//         const rect = canvas.getBoundingClientRect();
//         mouseX = e.clientX - rect.left;
//         mouseY = e.clientY - rect.top;
//     });

//     canvas.addEventListener('mouseleave', function () {
//         mouseX = -100;
//         mouseY = -100;
//     });

//     // Animation loop
//     function animate() {
//         ctx.clearRect(0, 0, canvas.width, canvas.height);

//         // Update and draw each line
//         for (let lineIndex = 0; lineIndex < linesPoints.length; lineIndex++) {
//             const points = linesPoints[lineIndex];

//             // Update points for this line
//             for (let i = 0; i < points.length; i++) {
//                 const point = points[i];

//                 // Calculate distance from mouse
//                 const dx = point.x - mouseX;
//                 const dy = point.y - mouseY;
//                 const distance = Math.sqrt(dx * dx + dy * dy);

//                 // Reset target to original position
//                 point.targetY = point.baseY;

//                 // If mouse is close enough, displace the point
//                 if (distance < influenceDistance) {
//                     // Calculate displacement based on distance
//                     const influence = 1 - (distance / influenceDistance);
//                     const displacement = maxDisplacement * influence;

//                     // Adjust target based on mouse position relative to the point
//                     if (mouseY < point.baseY) {
//                         point.targetY = point.baseY - displacement;
//                     } else {
//                         point.targetY = point.baseY + displacement;
//                     }
//                 }

//                 // Spring physics
//                 const spring = (point.targetY - point.y) * springFactor;
//                 point.velocity += spring;
//                 point.velocity *= damping;
//                 point.y += point.velocity;
//             }

//             // Draw each line
//             ctx.beginPath();
//             ctx.moveTo(0, points[0].y);

//             for (let i = 1; i < points.length - 2; i++) {
//                 // Use bezier curves for smoother lines
//                 const xc = (points[i].x + points[i + 1].x) / 2;
//                 const yc = (points[i].y + points[i + 1].y) / 2;
//                 ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
//             }

//             // Last curve
//             const last = points.length - 1;
//             ctx.quadraticCurveTo(
//                 points[last - 1].x,
//                 points[last - 1].y,
//                 points[last].x,
//                 points[last].y
//             );

//             ctx.strokeStyle = lineColor;
//             ctx.lineWidth = lineWidth;
//             ctx.stroke();
//         }

//         requestAnimationFrame(animate);
//     }


//     animate();
// }