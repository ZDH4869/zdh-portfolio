(() => {
  "use strict";

  const slides = [
    {group: "coding", file: "xaj-overview", medium: 840, title: "XAJ 洪水预报平台",
      description: "毕业设计 · 原始平台画面，可展开查看预报结果",
      alt: "XAJ 洪水预报平台原始界面，流域地图和预报参数",
      alternate: "xaj-result.png"},
    {group: "coding", file: "xaj-result", title: "XAJ 洪水预报结果",
      description: "毕业设计 · 洪水预报运行结果与流域地图",
      alt: "XAJ 洪水预报结果原始界面，显示流域地图和预报结果"},
    {group: "coding", file: "hydrolab", title: "HydroLab 水文计算助手",
      description: "运行录屏 · 插值对照、泰森多边形与 RK4 调洪",
      alt: "HydroLab 运行录屏，展示插值对照、泰森多边形面雨量和 RK4 调洪", animated: true},
    {group: "workflow", file: "bim-iteration", title: "PKPM AI 协作建模｜开发与迭代",
      description: "需求澄清、构件试跑与复盘，用冷水机组插入点偏移串联一轮改进",
      alt: "BIMBase AI 建模开发迭代图，包含需求澄清、规则编写、模型试跑、偏移排查和复盘"},
    {group: "workflow", file: "bim-skills", title: "BIMBase 建模 Skills｜协作图谱",
      description: "六个 Skills、配套 Markdown 文档与 MCP 参考资料",
      alt: "六个 BIMBase Skills 的分支、交互中枢、几何校验和知识支持关系"},
    {group: "workflow", file: "dify-review", title: "Dify 合同审查｜创建、运行与评测",
      description: "从审查参数和合同文本到 DOCX 报告，附五类合同的评测结果",
      alt: "Dify 合同审查工作流和五类合同的参考风险主题覆盖率"},
    {group: "ppt", file: "ppt-framework", width: 1300, title: "产品技术框架",
      description: "产品汇报原图 · BIMBase 平台、产品线与行业应用",
      alt: "BIMBase 平台技术框架与应用全景的汇报原页"},
    {group: "ppt", file: "ppt-library", width: 1301, title: "BIMBase 组件库搭建与参数化开发",
      description: "产品汇报原图 · 从图元库、开发指导到可复用组件",
      alt: "BIMBase 组件库及参数化组件的汇报原页"},
    {group: "ppt", file: "ppt-agent", width: 1297, title: "PKPM Agent 如何调用专业设计软件",
      description: "产品汇报原图 · 规划层、执行层与行业价值",
      alt: "PKPM Agent 二次开发拓展汇报原页"},
    {group: "ppt", file: "ppt-collaboration", width: 1296, title: "AI Agent、Skills 与设计师如何分工",
      description: "产品汇报原图 · 用简单类比解释人机协作",
      alt: "AI Agent、Skills、Markdown 和设计师的职责说明原页"},
    {group: "ppt", file: "ppt-tank", width: 1304, title: "产品建模案例与效果对比",
      description: "产品汇报原图 · 立式太阳能储热罐的参数确认、模型校验与结果",
      alt: "储热罐案例的参数确认表与 Python 建模和手动建模对照"},
  ];

  const sizes = "(max-width: 600px) calc(100vw - 24px), (max-width: 1560px) calc(100vw - 56px), 1504px";
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const tabs = Array.from(document.querySelectorAll("[data-group]"));
  const frame = document.getElementById("frame");
  const artwork = document.getElementById("expand-artwork");
  const title = document.getElementById("slide-title");
  const description = document.getElementById("slide-description");
  const caption = document.getElementById("slide-caption");
  const position = document.getElementById("slide-position");
  const play = document.getElementById("toggle-playback");
  const progress = document.getElementById("progress-bar");
  const viewer = document.getElementById("viewer");
  const viewerTitle = document.getElementById("viewer-title");
  const viewerBody = document.getElementById("viewer-body");
  const viewerImage = document.getElementById("viewer-image");
  const viewerError = document.getElementById("viewer-error");
  const zoom = document.getElementById("viewer-zoom");
  const alternate = document.getElementById("viewer-alternate");
  const prefetched = new Set();

  let current = 0;
  let playing = !motion.matches;
  let timeout;
  let progressAnimation;
  let pending;
  let activeMedia = frame.firstElementChild;
  let viewerRequest = 0;
  let alternateOpen = false;
  let gesture;
  let ignoreArtworkClickUntil = 0;

  function original(slide) {
    return "./assets/original/" + slide.file + (slide.animated ? ".gif" : ".png");
  }

  function setResponsiveSource(image, slide, reduced = motion.matches) {
    if (slide.animated) {
      image.src = reduced ? "./assets/hydrolab-poster.webp" : "./assets/hydrolab-animation.webp";
      return;
    }
    const base = "./assets/" + slide.file;
    image.sizes = sizes;
    const variants = [base + "-720.webp 720w"];
    if (slide.medium) variants.push(base + "-" + slide.medium + ".webp " + slide.medium + "w");
    variants.push(base + "-1440.webp " + (slide.width ?? 1440) + "w");
    image.srcset = variants.join(", ");
    image.src = base + "-720.webp";
  }

  function following(offset) {
    return (current + offset + slides.length) % slides.length;
  }

  function prefetchNext() {
    if (document.hidden || navigator.connection?.saveData) return;
    const next = slides[following(1)];
    if (prefetched.has(next.file)) return;
    prefetched.add(next.file);
    const warm = new Image();
    warm.fetchPriority = "low";
    warm.addEventListener("error", () => prefetched.delete(next.file), {once: true});
    setResponsiveSource(warm, next);
  }

  function reschedule() {
    clearTimeout(timeout);
    progressAnimation?.cancel();
    if (!playing || document.hidden || viewer.open || pending) return;
    const displayedImage = activeMedia?.querySelector("img");
    if (displayedImage && !displayedImage.complete) return;
    const dwell = slides[current].animated ? 4000 : 2500;
    progressAnimation = progress.animate(
      [{transform: "scaleX(0)"}, {transform: "scaleX(1)"}],
      {duration: dwell, fill: "forwards"},
    );
    timeout = setTimeout(() => select(following(1), 1), dwell);
  }

  function updatePlayback() {
    play.setAttribute("aria-label", playing ? "暂停自动播放" : "开始自动播放");
    caption.setAttribute("aria-live", playing ? "off" : "polite");
    reschedule();
  }

  function moveIn(newMedia, direction) {
    const departing = activeMedia;
    activeMedia = newMedia;
    newMedia.style.visibility = "";
    if (!departing || motion.matches) {
      frame.replaceChildren(newMedia);
      return;
    }
    frame.replaceChildren(departing, newMedia);
    departing.animate(
      [{transform: "translateX(0)", opacity: 1}, {transform: "translateX(" + (-direction * 22) + "%)", opacity: 0}],
      {duration: 180, easing: "ease-out", fill: "forwards"},
    );
    newMedia.animate(
      [{transform: "translateX(" + (direction * 26) + "%)", opacity: .44}, {transform: "translateX(0)", opacity: 1}],
      {duration: 180, easing: "ease-out"},
    ).finished.then(() => departing.remove(), () => departing.remove());
  }

  function loadSlide(slide, direction) {
    pending?.remove();
    const picture = document.createElement("picture");
    const image = new Image();
    image.alt = slide.alt;
    image.decoding = "async";
    image.draggable = false;
    image.fetchPriority = "high";
    picture.className = "slide-media";
    picture.style.visibility = "hidden";
    picture.append(image);
    frame.append(picture);
    pending = picture;

    image.addEventListener("load", async () => {
      try {
        await image.decode();
      } catch {
        // A responsive source may change while it is being decoded.
      }
      if (pending !== picture) return;
      pending = undefined;
      moveIn(picture, direction);
      prefetchNext();
      reschedule();
    }, {once: true});
    image.addEventListener("error", () => {
      if (pending !== picture) return;
      pending = undefined;
      activeMedia = undefined;
      const message = document.createElement("span");
      message.className = "frame-message";
      message.textContent = "图片暂时无法加载，可尝试打开原图";
      frame.replaceChildren(message);
      reschedule();
    }, {once: true});

    setResponsiveSource(image, slide);
  }

  function select(index, direction) {
    if (current === index) {
      reschedule();
      return;
    }
    current = index;
    const slide = slides[current];
    const inGroup = current - slides.findIndex((item) => item.group === slide.group) + 1;
    const total = slides.filter((item) => item.group === slide.group).length;

    for (const tab of tabs) {
      if (tab.dataset.group === slide.group) tab.setAttribute("aria-current", "true");
      else tab.removeAttribute("aria-current");
    }
    title.textContent = slide.title;
    description.textContent = slide.description;
    position.textContent = inGroup + " / " + total;
    position.setAttribute("aria-label", "当前类别第 " + inGroup + " 张，共 " + total + " 张");
    artwork.setAttribute("aria-label", "放大 " + slide.title);
    loadSlide(slide, direction);
    reschedule();
  }

  function setZoom(value) {
    viewerBody.classList.toggle("is-zoomed", value);
    zoom.setAttribute("aria-pressed", String(value));
    zoom.textContent = value ? "适应屏幕" : "放大细节";
    if (!value) viewerBody.scrollTo(0, 0);
  }

  function displayOriginal(slide) {
    const request = ++viewerRequest;
    const source = alternateOpen ? "./assets/original/" + slide.alternate : original(slide);
    viewerImage.alt = alternateOpen ? "XAJ 洪水预报结果原图" : slide.alt;
    viewerTitle.textContent = alternateOpen ? "XAJ 洪水预报结果" : slide.title;
    alternate.textContent = alternateOpen ? "返回平台首页画面" : "查看预报结果";
    viewerImage.hidden = false;
    viewerError.hidden = true;
    viewerImage.onload = () => { if (request === viewerRequest) viewerError.hidden = true; };
    viewerImage.onerror = () => {
      if (request !== viewerRequest) return;
      viewerImage.hidden = true;
      viewerError.hidden = false;
    };
    viewerImage.src = source;
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const next = slides.findIndex((slide) => slide.group === tab.dataset.group);
      select(next, next >= current ? 1 : -1);
    });
  }
  document.getElementById("prev-slide").addEventListener("click", () => select(following(-1), -1));
  document.getElementById("next-slide").addEventListener("click", () => select(following(1), 1));
  play.addEventListener("click", () => {
    playing = !playing;
    updatePlayback();
  });

  artwork.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") gesture = {x: event.clientX, y: event.clientY};
  });
  artwork.addEventListener("pointercancel", () => { gesture = undefined; });
  artwork.addEventListener("pointerup", (event) => {
    if (!gesture || event.pointerType !== "touch") return;
    const horizontal = event.clientX - gesture.x;
    const vertical = event.clientY - gesture.y;
    gesture = undefined;
    if (Math.abs(horizontal) < 45 || Math.abs(horizontal) < 1.2 * Math.abs(vertical)) return;
    const direction = horizontal < 0 ? 1 : -1;
    ignoreArtworkClickUntil = Date.now() + 380;
    select(following(direction), direction);
  });
  artwork.addEventListener("click", () => {
    if (Date.now() < ignoreArtworkClickUntil) return;
    const slide = slides[current];
    alternateOpen = false;
    alternate.hidden = !slide.alternate;
    setZoom(false);
    displayOriginal(slide);
    viewer.showModal();
    reschedule();
  });
  zoom.addEventListener("click", () => setZoom(!viewerBody.classList.contains("is-zoomed")));
  alternate.addEventListener("click", () => {
    alternateOpen = !alternateOpen;
    setZoom(false);
    displayOriginal(slides[current]);
  });
  document.getElementById("viewer-close").addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", (event) => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener("close", () => {
    viewerRequest++;
    viewerImage.onload = null;
    viewerImage.onerror = null;
    viewerImage.removeAttribute("src");
    reschedule();
  });

  document.addEventListener("keydown", (event) => {
    if (viewer.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    select(following(direction), direction);
  });
  document.addEventListener("visibilitychange", () => {
    reschedule();
    if (!document.hidden) prefetchNext();
  });
  motion.addEventListener("change", (event) => {
    if (!event.matches) return;
    playing = false;
    updatePlayback();
    if (slides[current].animated) loadSlide(slides[current], 1);
  });

  const firstImage = activeMedia.querySelector("img");
  if (firstImage.complete) prefetchNext();
  else {
    const firstImageSettled = () => {
      if (!activeMedia?.contains(firstImage)) return;
      prefetchNext();
      reschedule();
    };
    firstImage.addEventListener("load", firstImageSettled, {once: true});
    firstImage.addEventListener("error", firstImageSettled, {once: true});
  }
  updatePlayback();
})();
