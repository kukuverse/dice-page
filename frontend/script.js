const reveals = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add("is-visible"));
}

const header = document.querySelector(".site-header");

const syncHeader = () => {
  if (!header) {
    return;
  }

  header.classList.toggle("is-scrolled", window.scrollY > 18);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

const pageName = (() => {
  const pathName = window.location.pathname.replace(/\/+$/, "") || "/";
  const pathAliasMap = {
    "/": "story",
    "/story": "story",
    "/story.html": "story",
    "/products": "index",
    "/products.html": "index",
    "/index": "index",
    "/index.html": "index",
    "/lab": "lab",
    "/lab.html": "lab"
  };

  if (pathAliasMap[pathName]) {
    return pathAliasMap[pathName];
  }

  const fileName = pathName.split("/").pop() || "story.html";
  return fileName.replace(".html", "") || "story";
})();

const defaultCreateItems = [
  {
    id: "dice",
    navLabel: "Dice",
    title: "Precision Dice",
    description: "Machined for tactile balance, clean numerals, and the kind of table presence that turns every roll into a ritual.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBt78FR6pN9vXPMoKECvwMWqUQKSBwRXn0nAkNqloORrRR6xwpunVU3h8190o1cQ5DC6cDi2M7FAD0LevofU-XOvBTwf1PHEEVdvNRfjCdcQSVLZ4DI5XReHqoBR0uL8oN6x9vicP7wK5ZD9Vf_qUkQkRTbXFB-Xy6WRcc6jyo_RuCdUthoI61iT-TB6gsa-ySpnp_SGr0t-k0j0uYNfYXMs4fTAHiv92JDoSc4VkRnnQWEIRmxcL7tEPEo6G41dn5-Ce4B6WYcAzV-"
  },
  {
    id: "display-pieces",
    navLabel: "Display Pieces",
    title: "Display Pieces",
    description: "Showcase forms built to live on shelves, desks, and altars for the worlds that stay with you long after the screen goes dark.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAML2zbq6MHZkSTlqQmQzSsQJh8_MdTYPCowYWWbKBIvuuXpsC8LCr0demnw9JON70ZC-huKIPixRm2XzcAl4WHYO6qdZHy93K9Akiu00zEK2CtJdnV3AfpMrDWcxd-aBK-4X5qd_jh4bvLKZ9NTOPbVAH1V6UXs376jEhJqtvW0W7hMsl6UpLtmwIG4YuJg2_9X0s-v89RW5dnJzKRUjsB0gCb_2V4pxZFvkKMbCAcxO3WJWGibB6ekXHApMISbVWOHbt28G44_rq1"
  },
  {
    id: "accessories",
    navLabel: "Accessories",
    title: "Accessories",
    description: "Companion objects designed to complete the ritual, from carry systems to desk artifacts that extend the Kukuverse mood.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXnSEwaCHdzyeivssvPtepr5QUn7wZLvqnPmgk_o9E3BGFxodvhSMeXoJvMixzr_H_3adHSbWdCJTl5sOwGg-1xFiveXX_nRVgtcGzbUa2ubb54-xiyrHLFgEX7c9eftmXzT4TlFiW9Trc2Xojv-D3I7_pQQz6wZu2kLd0cIpOdM72tu6RQFYY3MA6yAAJ9qXwjbEWg38_jDUAZ-tDKOgV9wQnUpg2cSkcdnK99dK8rDPki43W6HjgHuh8dh8iK0pDMhroYiwSFWNx"
  }
];

let destroyCreateSlider = null;
let destroyProductGallery = null;
let destroyArmoryCarousel = null;
const defaultProductGalleryItems = [
  {
    id: "vault-x1-1",
    image: "https://res.cloudinary.com/dpohad7sa/image/upload/v1781246996/kukuverse/uploads/1781168568215-82ca652cb7e54667.jpg",
    alt: "Vault X1 hero image 1"
  },
  {
    id: "vault-x1-2",
    image: "https://res.cloudinary.com/dpohad7sa/image/upload/v1781247039/kukuverse/uploads/1781168965501-163b7b8849252c41.jpg",
    alt: "Vault X1 hero image 2"
  },
  {
    id: "vault-x1-3",
    image: "https://res.cloudinary.com/dpohad7sa/image/upload/v1781247090/kukuverse/uploads/1781168973202-2ba34318625a70e3.jpg",
    alt: "Vault X1 hero image 3"
  }
];
const defaultArmoryItems = [
  {
    id: "obsidian-core-d20",
    image: "https://res.cloudinary.com/dpohad7sa/image/upload/v1781247408/kukuverse/uploads/1781171007131-a1b5b4355612b195.png",
    title: "House of Elliådey",
    subtitle: "",
    alt: "House of Elliådey"
  },
  {
    id: "titanium-hex-set",
    image: "https://res.cloudinary.com/dpohad7sa/image/upload/v1781247420/kukuverse/uploads/1781171465545-06a92b392994b772.png",
    title: "Tree of Ténéré",
    subtitle: "",
    alt: "Tree of Ténéré"
  },
  {
    id: "singularity-die",
    image: "https://res.cloudinary.com/dpohad7sa/image/upload/v1781247441/kukuverse/uploads/1781171498821-4ae680a705520237.jpg",
    title: "Point Nemo",
    subtitle: "",
    alt: "Point Nemo"
  },
  {
    id: "svalbard-seed-vault",
    image: "https://res.cloudinary.com/dpohad7sa/image/upload/v1781247489/kukuverse/uploads/1781171550545-fc384b2a5423d7a9.jpg",
    title: "Svalbard Seed Vault",
    subtitle: "",
    alt: "Svalbard Seed Vault"
  },
  {
    id: "voyager-1",
    image: "https://res.cloudinary.com/dpohad7sa/image/upload/v1781247521/kukuverse/uploads/1781172260556-15ddc34bbd916a62.jpg",
    title: "Voyager 1",
    subtitle: "",
    alt: "Voyager 1"
  }
];

function applyTextStyle(element, style = {}) {
  element.classList.add("admin-formatted-text");
  element.style.fontSize = style.fontSize || "";
  element.style.fontWeight = style.fontWeight || "";
  element.style.fontStyle = style.fontStyle || "";
  element.style.color = style.color || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateContentImage(element, source) {
  element.classList.add("dynamic-content-image");
  element.classList.remove("is-loaded");

  if (!source) {
    element.removeAttribute("src");
    return;
  }

  const revealImage = () => element.classList.add("is-loaded");
  element.addEventListener("load", revealImage, { once: true });
  element.addEventListener("error", () => element.classList.remove("is-loaded"), { once: true });
  element.src = source;

  if (element.complete && element.naturalWidth > 0) {
    revealImage();
  }
}

function initializeCreateSlider() {
  const createSlider = document.querySelector("[data-create-slider]");
  if (!createSlider) {
    return null;
  }

  const slides = Array.from(createSlider.querySelectorAll(".create-slide"));
  const controls = Array.from(document.querySelectorAll("[data-slide-target]"));
  const navItems = Array.from(document.querySelectorAll(".create-nav-item"));
  const dots = Array.from(createSlider.querySelectorAll(".create-dot"));
  if (!slides.length) {
    return null;
  }

  let currentSlide = 0;
  let sliderTimer = 0;

  const setSlide = (nextIndex) => {
    currentSlide = nextIndex;

    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === nextIndex);
    });

    navItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === nextIndex);
    });

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === nextIndex);
    });
  };

  const restartTimer = () => {
    window.clearInterval(sliderTimer);
    if (slides.length < 2) {
      return;
    }

    sliderTimer = window.setInterval(() => {
      const nextIndex = (currentSlide + 1) % slides.length;
      setSlide(nextIndex);
    }, 4500);
  };

  controls.forEach((control) => {
    control.addEventListener("click", () => {
      const nextIndex = Number(control.dataset.slideTarget || 0);
      setSlide(nextIndex);
      restartTimer();
    });
  });

  setSlide(0);
  restartTimer();

  return () => window.clearInterval(sliderTimer);
}

function renderCreateSection(items = []) {
  const nav = document.querySelector("[data-create-nav]");
  const slides = document.querySelector("[data-create-slides]");
  const dots = document.querySelector("[data-create-dots]");
  if (!nav || !slides || !dots) {
    return;
  }

  const list = Array.isArray(items) ? items : defaultCreateItems;

  nav.innerHTML = list.map((item, index) => `
    <button class="create-nav-item ${index === 0 ? "is-active" : ""}" type="button" data-slide-target="${index}">
      <span class="admin-formatted-text" data-create-style="nav" data-create-index="${index}">${escapeHtml(item.navLabel)}</span>
    </button>
  `).join("");

  slides.innerHTML = list.length
    ? list.map((item, index) => `
      <article class="create-slide ${index === 0 ? "is-active" : ""}" data-slide-index="${index}">
        <div class="media-frame">
          <div class="frame wide">
            <img src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.title || item.navLabel || `Create item ${index + 1}`)}">
          </div>
          <div class="create-caption">
            <h3 class="title-sm admin-formatted-text" data-create-style="title" data-create-index="${index}">${escapeHtml(item.title || "")}</h3>
            <p class="copy admin-formatted-text" data-create-style="description" data-create-index="${index}">${escapeHtml(item.description || "")}</p>
          </div>
        </div>
      </article>
    `).join("")
    : '<div class="create-empty">More categories coming soon.</div>';

  dots.innerHTML = list.map((item, index) => `
    <button
      class="create-dot ${index === 0 ? "is-active" : ""}"
      type="button"
      data-slide-target="${index}"
      aria-label="Show ${escapeHtml(item.navLabel || `slide ${index + 1}`)} slide"
    ></button>
  `).join("");

  list.forEach((item, index) => {
    document.querySelectorAll(`[data-create-style="nav"][data-create-index="${index}"]`).forEach((element) => {
      applyTextStyle(element, item.navStyle);
    });
    document.querySelectorAll(`[data-create-style="title"][data-create-index="${index}"]`).forEach((element) => {
      applyTextStyle(element, item.titleStyle);
    });
    document.querySelectorAll(`[data-create-style="description"][data-create-index="${index}"]`).forEach((element) => {
      applyTextStyle(element, item.descriptionStyle);
    });
  });

  destroyCreateSlider?.();
  destroyCreateSlider = initializeCreateSlider();
}

function initializeProductGallery() {
  const gallery = document.querySelector("[data-product-gallery]");
  if (!gallery) {
    return null;
  }

  const slides = Array.from(gallery.querySelectorAll(".product-gallery-slide"));
  const dots = Array.from(gallery.querySelectorAll(".product-gallery-dot"));
  if (!slides.length) {
    return null;
  }

  let currentSlide = 0;
  let sliderTimer = 0;

  const setSlide = (nextIndex) => {
    currentSlide = nextIndex;
    slides.forEach((slide, index) => slide.classList.toggle("is-active", index === nextIndex));
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === nextIndex));
  };

  const restartTimer = () => {
    window.clearInterval(sliderTimer);
    if (slides.length < 2) {
      return;
    }

    sliderTimer = window.setInterval(() => {
      setSlide((currentSlide + 1) % slides.length);
    }, 4200);
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      setSlide(Number(dot.dataset.galleryTarget || 0));
      restartTimer();
    });
  });

  setSlide(0);
  restartTimer();

  return () => window.clearInterval(sliderTimer);
}

function renderProductGallery(items = []) {
  const slidesRoot = document.querySelector("[data-product-gallery-slides]");
  const dotsRoot = document.querySelector("[data-product-gallery-dots]");
  if (!slidesRoot || !dotsRoot) {
    return;
  }

  const list = Array.isArray(items) ? items : defaultProductGalleryItems;

  slidesRoot.innerHTML = list.length ? list.map((item, index) => `
    <div class="product-gallery-slide ${index === 0 ? "is-active" : ""}" data-gallery-index="${index}">
      <img src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.alt || `Product image ${index + 1}`)}">
    </div>
  `).join("") : "";

  dotsRoot.innerHTML = list.length > 1
    ? list.map((item, index) => `
      <button
        class="product-gallery-dot ${index === 0 ? "is-active" : ""}"
        type="button"
        data-gallery-target="${index}"
        aria-label="Show product image ${index + 1}"
      ></button>
    `).join("")
    : "";

  destroyProductGallery?.();
  destroyProductGallery = initializeProductGallery();
}

function initializeArmoryCarousel() {
  const track = document.querySelector("[data-armory-track]");
  const prev = document.querySelector("[data-armory-prev]");
  const next = document.querySelector("[data-armory-next]");
  if (!track || !prev || !next) {
    return null;
  }

  const scrollAmount = () => {
    const firstCard = track.querySelector(".product-card");
    if (!firstCard) {
      return track.clientWidth;
    }

    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const cardStep = firstCard.getBoundingClientRect().width + gap;
    const visibleCards = Math.max(1, Math.round((track.clientWidth + gap) / cardStep));
    return cardStep * visibleCards;
  };
  const scrollToDirection = (direction) => {
    track.scrollBy({ left: direction * scrollAmount(), behavior: "smooth" });
  };

  const onPrev = () => scrollToDirection(-1);
  const onNext = () => scrollToDirection(1);

  prev.addEventListener("click", onPrev);
  next.addEventListener("click", onNext);

  return () => {
    prev.removeEventListener("click", onPrev);
    next.removeEventListener("click", onNext);
  };
}

function renderArmoryCarousel(items = []) {
  const track = document.querySelector("[data-armory-track]");
  const prev = document.querySelector("[data-armory-prev]");
  const next = document.querySelector("[data-armory-next]");
  if (!track) {
    return;
  }

  const list = Array.isArray(items) ? items : defaultArmoryItems;
  track.innerHTML = list.length ? list.map((item) => `
    <article class="card product-card">
      <div class="card-image">
        <img src="${escapeHtml(item.image || "")}" alt="${escapeHtml(item.alt || item.title || "Product category")}">
      </div>
      <div class="card-body product-meta no-price">
        <div>
          <h3 class="title-sm admin-formatted-text">${escapeHtml(item.title || "")}</h3>
          <div class="label admin-formatted-text">${escapeHtml(item.subtitle || "")}</div>
        </div>
      </div>
    </article>
  `).join("") : '<div class="armory-empty">More categories coming soon.</div>';

  if (prev) {
    prev.hidden = list.length < 2;
  }
  if (next) {
    next.hidden = list.length < 2;
  }

  destroyArmoryCarousel?.();
  destroyArmoryCarousel = initializeArmoryCarousel();
}

const loadPageContent = () => {
  return fetch(`/api/content?page=${encodeURIComponent(pageName)}`)
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then(({ entries }) => {
      if (pageName === "story") {
        renderCreateSection(entries?.createItems?.items);
      }
      if (pageName === "index") {
        renderProductGallery(entries?.heroGallery?.items);
        renderArmoryCarousel(entries?.armoryItems?.items);
      }

      Object.entries(entries || {}).forEach(([key, entry]) => {
        if (entry.type === "collection") {
          return;
        }

        document.querySelectorAll(`[data-content-key="${key}"]`).forEach((element) => {
          if (entry.type === "image" && element instanceof HTMLImageElement) {
            updateContentImage(element, entry.value);
          } else if (entry.type === "html") {
            element.classList.add("admin-formatted-text");
            element.innerHTML = entry.value;
            applyTextStyle(element, entry.style);
          } else {
            element.classList.add("admin-formatted-text");
            element.textContent = entry.value;
            applyTextStyle(element, entry.style);
          }
        });
      });
      document.documentElement.dataset.contentReady = "true";
    })
    .catch((error) => {
      document.documentElement.dataset.contentReady = "fallback";
      console.error("Unable to load managed page content.", error);
    });
};

if (window.location.protocol !== "file:") {
  loadPageContent();

  if ("EventSource" in window) {
    const contentEvents = new EventSource("/api/content/events");
    contentEvents.addEventListener("content-update", (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.pages?.includes(pageName) || update.pages?.includes("shared")) {
          loadPageContent();
        }
      } catch {
        loadPageContent();
      }
    });
  }
}

if (pageName === "story") {
  renderCreateSection(defaultCreateItems);
}

if (pageName === "index") {
  renderProductGallery(defaultProductGalleryItems);
  renderArmoryCarousel(defaultArmoryItems);
}

const openModal = (name) => {
  const modal = document.querySelector(`[data-modal="${name}"]`);
  if (!modal) {
    return;
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector("input, textarea, button")?.focus();
};

const closeModal = (modal) => {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
};

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.openModal));
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest("[data-modal]");
    if (modal) {
      closeModal(modal);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  const modal = document.querySelector("[data-modal]:not([hidden])");
  if (modal) {
    closeModal(modal);
  }
});

document.querySelectorAll("[data-public-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = form.querySelector("[data-form-message]");
    const submitButton = form.querySelector('button[type="submit"]');
    const type = form.dataset.publicForm;

    if (window.location.protocol === "file:") {
      message.textContent = "Please open the site through http://127.0.0.1:4173 to submit this form.";
      return;
    }

    message.textContent = "Sending...";
    submitButton.disabled = true;

    try {
      const response = await fetch(`/api/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit the form.");
      }

      form.reset();
      message.textContent = type === "join"
        ? "You are on the list. We will email you when the next campaign goes live."
        : "Your message has been received. We will get back to you soon.";
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });
});
