// Wait for Matter.js to load
window.addEventListener("load", function () {
  const icon = document.getElementById("draggableIcon");
  const placeholder = document.getElementById("placeholder");
  const downloadBtn = document.getElementById("downloadBtn");
  const downloadSection = document.querySelector(".download-section");
  const canvas = document.getElementById("physics-canvas");
  const ctx = canvas.getContext("2d");

  const iconSize = 180;
  const iconHalfSize = iconSize / 2;
  let isDragging = false;
  let engine, iconBody, mouseConstraint;
  let animationId;
  let mouseX = 0,
    mouseY = 0;

  downloadBtn.classList.remove("downloading");

  // Load the icon image
  const iconImage = new Image();
  iconImage.src = "loupe-icon.png";

  // Helper function to draw the icon
  function drawIcon(ctx) {
    // Set shadow to match CSS
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    // Draw rounded rectangle background (in case image doesn't load)
    ctx.fillStyle = "transparent";
    ctx.beginPath();
    ctx.roundRect(-iconHalfSize, -iconHalfSize, iconSize, iconSize, 40);
    ctx.fill();

    // Reset shadow for image
    ctx.shadowColor = "transparent";

    // Draw the image if loaded
    if (iconImage.complete && iconImage.naturalHeight !== 0) {
      ctx.save();
      // Clip to rounded rectangle
      ctx.beginPath();
      ctx.roundRect(-iconHalfSize, -iconHalfSize, iconSize, iconSize, 40);
      ctx.clip();

      // Draw image to cover the entire icon area
      ctx.drawImage(
        iconImage,
        -iconHalfSize,
        -iconHalfSize,
        iconSize,
        iconSize
      );
      ctx.restore();
    }
  }

  // Store the original position on page load
  const homePosition = {
    x: icon.getBoundingClientRect().left + iconHalfSize,
    y: icon.getBoundingClientRect().top + iconHalfSize,
  };

  // Check if Matter.js loaded
  if (typeof Matter === "undefined") {
    console.error("Matter.js failed to load");
    return;
  }

  // Set canvas size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Matter.js setup
  const Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Constraint = Matter.Constraint;

  // Create physics engine with no gravity for dragging
  engine = Engine.create();
  engine.world.gravity.y = 0;

  // Track mouse position
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener("touchmove", (e) => {
    if (e.touches[0]) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  });

  icon.addEventListener("mousedown", startDrag);
  icon.addEventListener("touchstart", startDrag);

  function startDrag(e) {
    e.preventDefault();
    if (isDragging) return;

    isDragging = true;

    // Get initial mouse position
    if (e.type === "touchstart") {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    } else {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    // Get the icon's current position BEFORE hiding it
    const iconRect = icon.getBoundingClientRect();
    const startX = iconRect.left + iconHalfSize; // Center of icon
    const startY = iconRect.top + iconHalfSize; // Center of icon

    // Show placeholder
    placeholder.classList.add("visible");

    // Hide original icon
    icon.style.visibility = "hidden";
    icon.classList.add("dragging");

    // Set grabbing cursor on body during drag
    document.body.style.cursor = "grabbing";

    // Target position (icon centered with top-left at cursor)
    const targetX = mouseX + iconHalfSize;
    const targetY = mouseY + iconHalfSize;

    // Create icon body in physics world at current icon position
    iconBody = Bodies.rectangle(startX, startY, iconSize, iconSize, {
      frictionAir: 0.1,
      restitution: 0.1,
      density: 0.1,
    });

    World.add(engine.world, iconBody);

    // Animate the icon to the cursor position
    let animationProgress = 0;
    const animationDuration = 90; // milliseconds
    const startTime = Date.now();

    function animateToPosition() {
      const elapsed = Date.now() - startTime;
      animationProgress = Math.min(elapsed / animationDuration, 1);

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - animationProgress, 3);

      // Interpolate position
      const currentX = startX + (targetX - startX) * easeOut;
      const currentY = startY + (targetY - startY) * easeOut;

      Body.setPosition(iconBody, { x: currentX, y: currentY });

      // Draw during animation
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(iconBody.position.x, iconBody.position.y);
      ctx.rotate(iconBody.angle);

      drawIcon(ctx);

      ctx.restore();

      if (animationProgress < 1) {
        requestAnimationFrame(animateToPosition);
      } else {
        // Animation complete, now attach the constraint
        mouseConstraint = Constraint.create({
          pointA: { x: mouseX, y: mouseY },
          bodyB: iconBody,
          pointB: { x: -iconHalfSize + 20, y: -iconHalfSize + 20 }, // Offset to top-left corner of the icon
          stiffness: 0.5, // Lower = more springy/ragdoll effect
          damping: 0.1,
          length: 0,
        });

        World.add(engine.world, mouseConstraint);

        // Start the main animation loop
        animate();
      }
    }

    animateToPosition();

    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);
  }

  function animate() {
    if (!isDragging) return;

    // Update the mouse constraint anchor point to follow the cursor
    mouseConstraint.pointA.x = mouseX;
    mouseConstraint.pointA.y = mouseY;

    // Add gravity for natural dangling effect
    engine.world.gravity.y = 80;

    Engine.update(engine, 16.666);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the icon body
    ctx.save();
    ctx.translate(iconBody.position.x, iconBody.position.y);
    ctx.rotate(iconBody.angle);

    drawIcon(ctx);

    ctx.restore();

    // Check if over download section
    const sectionRect = downloadSection.getBoundingClientRect();
    const isOverSection =
      iconBody.position.x - iconHalfSize < sectionRect.right &&
      iconBody.position.x + iconHalfSize > sectionRect.left &&
      iconBody.position.y - iconHalfSize < sectionRect.bottom &&
      iconBody.position.y + iconHalfSize > sectionRect.top;

    if (isOverSection) {
      downloadSection.classList.add("drop-active");
    } else {
      downloadSection.classList.remove("drop-active");
    }

    animationId = requestAnimationFrame(animate);
  }

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;

    // Check if over download section
    const sectionRect = downloadSection.getBoundingClientRect();
    const isOverSection =
      iconBody.position.x - iconHalfSize < sectionRect.right &&
      iconBody.position.x + iconHalfSize > sectionRect.left &&
      iconBody.position.y - iconHalfSize < sectionRect.bottom &&
      iconBody.position.y + iconHalfSize > sectionRect.top;

    // Clean up main animation loop
    cancelAnimationFrame(animationId);

    // Remove mouse constraint but keep the icon body in physics world for drop animation
    if (mouseConstraint) {
      World.remove(engine.world, mouseConstraint);
      mouseConstraint = null;
    }

    // Turn off gravity for the drop animation
    engine.world.gravity.y = 0;

    // Store current position and determine target
    const startX = iconBody.position.x;
    const startY = iconBody.position.y;
    const startAngle = iconBody.angle;

    let targetX, targetY;
    if (isOverSection) {
      // Target is the center of the download section
      targetX = sectionRect.left + sectionRect.width / 2;
      targetY = sectionRect.top + sectionRect.height / 2;
    } else {
      // Target is the original home position
      targetX = homePosition.x;
      targetY = homePosition.y;
    }

    // Animate the icon to the target position
    let dropAnimationProgress = 0;
    const dropAnimationDuration = 200; // milliseconds
    const dropStartTime = Date.now();

    function animateDropToPosition() {
      const elapsed = Date.now() - dropStartTime;
      dropAnimationProgress = Math.min(elapsed / dropAnimationDuration, 1);

      // Easing function for smooth animation (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - dropAnimationProgress, 3);

      // Interpolate position
      const currentX = startX + (targetX - startX) * easeOut;
      const currentY = startY + (targetY - startY) * easeOut;
      const currentAngle = startAngle + (0 - startAngle) * easeOut; // Rotate back to 0

      Body.setPosition(iconBody, { x: currentX, y: currentY });
      Body.setAngle(iconBody, currentAngle);

      // Clear canvas and draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(iconBody.position.x, iconBody.position.y);
      ctx.rotate(iconBody.angle);

      drawIcon(ctx);

      ctx.restore();

      if (dropAnimationProgress < 1) {
        requestAnimationFrame(animateDropToPosition);
      } else {
        // Animation complete, clean up physics
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (engine && iconBody) {
          World.clear(engine.world);
          Engine.clear(engine);
        }

        if (isOverSection) {
          // Download triggered
          downloadApp();

          // Move the actual icon element to the download section position
          const sectionCenterX =
            sectionRect.left + sectionRect.width / 2 - iconHalfSize;
          const sectionCenterY =
            sectionRect.top + sectionRect.height / 2 - iconHalfSize;

          icon.style.position = "fixed";
          icon.style.left = sectionCenterX + "px";
          icon.style.top = sectionCenterY + "px";
          icon.style.visibility = "visible";
          icon.classList.remove("dragging");

          // After a delay, snap back to original position
          setTimeout(() => {
            icon.style.position = "";
            icon.style.left = "";
            icon.style.top = "";
          }, 1500);
        } else {
          // Return to original position
          icon.style.visibility = "visible";
          icon.classList.remove("dragging");
        }

        placeholder.classList.remove("visible");
        downloadSection.classList.remove("drop-active");

        // Reset cursor
        document.body.style.cursor = "";
      }
    }

    animateDropToPosition();

    document.removeEventListener("mouseup", endDrag);
    document.removeEventListener("touchend", endDrag);
  }

  function downloadApp() {
    const link = document.createElement("a");
    link.href = "https://loop.build/loupe-app.dmg";
    link.download = "Loupe.dmg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadBtn.classList.add("downloading");

    setTimeout(() => {
      downloadBtn.classList.remove("downloading");
    }, 2000);
  }

  downloadBtn.addEventListener("click", downloadApp);

  // Video overlay functionality
  const seeActionBtn = document.getElementById("seeActionBtn");
  const videoOverlay = document.getElementById("videoOverlay");
  const closeVideoBtn = document.getElementById("closeVideo");
  const youtubeVideo = document.getElementById("youtubeVideo");

  // Sample YouTube video - replace with your actual video ID
  const videoId = "dQw4w9WgXcQ"; // Rick Roll for demo - replace with your video
  const videoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  seeActionBtn.addEventListener("click", function (e) {
    e.preventDefault();

    // Set the video source when opening
    youtubeVideo.src = videoUrl;

    // Show overlay with animation
    videoOverlay.style.display = "flex";
    setTimeout(() => {
      videoOverlay.classList.add("active");
    }, 10);

    // Prevent body scroll when overlay is open
    document.body.style.overflow = "hidden";
  });

  function closeVideoOverlay() {
    videoOverlay.classList.remove("active");

    // Wait for animation to finish before hiding
    setTimeout(() => {
      videoOverlay.style.display = "none";
      // Clear video source to stop playback
      youtubeVideo.src = "";
      // Restore body scroll
      document.body.style.overflow = "";
    }, 300);
  }

  closeVideoBtn.addEventListener("click", closeVideoOverlay);

  // Close on clicking outside the video
  videoOverlay.addEventListener("click", function (e) {
    if (e.target === videoOverlay) {
      closeVideoOverlay();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && videoOverlay.classList.contains("active")) {
      closeVideoOverlay();
    }
  });
});
