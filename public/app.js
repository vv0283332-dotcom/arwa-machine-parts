const WHATSAPP_NUMBERS = [
  "22962347899",
  "22957126009"
];

const WHATSAPP = WHATSAPP_NUMBERS[0];

let products = [];

async function loadProducts() {
  try {
    const response = await fetch("/api/products", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Failed to load products");
    }

    products = await response.json();
    renderProducts();
  } catch (error) {
    console.error("Could not load products:", error);
    products = [];
    renderProducts();
  }
}


let cart =
  JSON.parse(
    localStorage.getItem("arwaCart") || "[]"
  );


const $ = selector =>
  document.querySelector(selector);


function saveCart() {

  localStorage.setItem(
    "arwaCart",
    JSON.stringify(cart)
  );

}


function showToast(message) {

  const toast = $("#toast");

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(
    () => toast.classList.remove("show"),
    1800
  );

}


function addToCart(id) {

  const product =
    products.find(
      item => String(item.id) === String(id)
    );

  if (!product) {
    showToast("Product not found.");
    return;
  }

  const stock = Number(product.stock);

  if (!Number.isFinite(stock) || stock <= 0) {
    showToast("This part is currently out of stock.");
    return;
  }

  const existing =
    cart.find(item => item.id === id);

  const currentQuantity =
    existing ? Number(existing.quantity) : 0;

  if (currentQuantity >= stock) {
    showToast(`Only ${stock} available.`);
    return;
  }

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id,
      quantity: 1
    });
  }

  saveCart();
  renderCart();

  showToast("Part added to your order.");
}


function changeQuantity(id, amount) {

  const item =
    cart.find(item => item.id === id);

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {

    cart =
      cart.filter(item => item.id !== id);

  }

  saveCart();

  renderCart();

}


function formatPrice(price) {
  const value = Number(price);

  if (!Number.isFinite(value)) {
    return "Price on request";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0
  }).format(value) + " XOF";
}


function productAvailability(product) {
  const stock = Number(product.stock);

  if (Number.isFinite(stock) && stock > 0) {
    return {
      label: `${stock} in stock`,
      className: "in-stock",
      available: true
    };
  }

  return {
    label: "OUT OF STOCK",
    className: "out-of-stock",
    available: false
  };
}


function whatsappURL(message, number = WHATSAPP) {
  const cleanNumber =
    String(number || WHATSAPP).replace(/\D/g, "");

  return "https://wa.me/" +
    cleanNumber +
    "?text=" +
    encodeURIComponent(message);
}


function productWhatsApp(product) {
  const selectedNumber =
    document.querySelector("#whatsappNumber")?.value ||
    WHATSAPP;

  const message =
    `Hello ARWA, I am interested in this machine part:

` +
    `Product: ${product.name || "Machine part"}
` +
    `Category: ${product.category || "N/A"}
` +
    `Price: ${formatPrice(product.price)}

` +
    `Please confirm availability.`;

  return whatsappURL(message, selectedNumber);
}


function openProductDetails(id) {

  const product =
    products.find(
      item => String(item.id) === String(id)
    );

  if (!product) return;

  const availability =
    productAvailability(product);

  const modal =
    document.createElement("div");

  modal.className =
    "product-modal";

  modal.innerHTML = `
    <div class="product-modal-backdrop"
         onclick="this.parentElement.remove()"></div>

    <div class="product-modal-card">

      <button
        class="product-modal-close"
        onclick="this.closest('.product-modal').remove()"
        aria-label="Close"
      >
        ×
      </button>

      <div class="product-detail-image">

        ${
          product.image
            ? `
              <img
                src="${product.image}"
                alt="${product.name}"
              >
            `
            : `
              <div class="product-placeholder-large">
                ⚙
              </div>
            `
        }

      </div>

      <div class="product-detail-content">

        <span class="category-badge">
          ${product.category}
        </span>

        <h2>
          ${product.name}
        </h2>

        <p class="product-detail-description">
          ${
            product.description ||
            "Contact ARWA for product specifications and availability."
          }
        </p>

        <div class="product-detail-price">
          ${formatPrice(product.price)}
        </div>

        <div class="availability ${availability.className}">
          <span></span>
          ${availability.label}
        </div>

        <div class="product-detail-actions">

          <a
            href="${productWhatsApp(product)}"
            target="_blank"
            rel="noopener"
            class="button primary"
          >
            WhatsApp to order
          </a>

          <button
            class="button secondary"
            onclick="this.closest('.product-modal').remove()"
          >
            Close
          </button>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(modal);
}


function renderProducts() {

  const search =
    $("#searchInput").value
      .trim()
      .toLowerCase();

  const category =
    $("#categorySelect").value;

  const filtered =
    products.filter(product => {

      const text =
        `${product.name || ""} ${product.description || ""} ${product.category || ""}`
          .toLowerCase();

      const matchesSearch =
        text.includes(search);

      const matchesCategory =
        category === "all" ||
        product.category === category;

      return matchesSearch &&
        matchesCategory;

    });


  $("#productsGrid").innerHTML =
    filtered.length

      ? filtered.map(product => {

          const availability =
            productAvailability(product);

          return `
            <article
              class="product-card"
              onclick="openProductDetails('${String(product.id).replace(/'/g, "\'")}')"
            >

              <div class="product-photo">

                ${
                  product.image
                    ? `
                      <img
                        src="${product.image}"
                        alt="${product.name}"
                        loading="lazy"
                      >
                    `
                    : `
                      <div class="product-placeholder">
                        <span>ARWA</span>
                        <strong>⚙</strong>
                        <small>MACHINE PARTS</small>
                      </div>
                    `
                }

                <span class="category-badge product-category-badge">
                  ${product.category}
                </span>

                <span class="availability ${availability.className}">
                  <span></span>
                  ${availability.label}
                </span>

              </div>

              <div class="product-card-body">

                <div class="product-card-top">

                  <span>
                    ARWA MACHINE PARTS
                  </span>

                </div>

                <h3>
                  ${product.name}
                </h3>

                <p>
                  ${
                    product.description ||
                    "Quality machine part supplied by ARWA."
                  }
                </p>

                <div class="product-card-footer">

                  <strong class="product-price">
                    ${formatPrice(product.price)}
                  </strong>

                  <span class="view-product">
                    View details →
                  </span>

                </div>

                ${
                  availability.available
                    ? `
                      <a
                        href="${productWhatsApp(product)}"
                        target="_blank"
                        rel="noopener"
                        class="product-whatsapp"
                        onclick="event.stopPropagation()"
                      >
                        WhatsApp order
                      </a>
                    `
                    : `
                      <button
                        type="button"
                        class="product-whatsapp product-disabled"
                        disabled
                        onclick="event.stopPropagation()"
                      >
                        Out of stock
                      </button>
                    `
                }

              </div>

            </article>
          `;

        }).join("")

      : `
        <div class="empty-products">

          <div class="empty-products-icon">
            ⚙
          </div>

          <h3>
            No parts found
          </h3>

          <p>
            Try another search or category.
          </p>

        </div>
      `;
}


function renderCart() {

  const count =
    cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  $("#cartCount").textContent =
    count;


  if (!cart.length) {

    $("#cartItems").innerHTML = `

      <p style="
        color:#9aa3ad;
        padding:30px 0;
      ">
        Your order is empty.
        Add the parts you need.
      </p>

    `;

    return;

  }


  $("#cartItems").innerHTML =
    cart.map(item => {

      const product =
        products.find(
          p => p.id === item.id
        );

      return `

        <div class="cart-line">

          <div class="cart-icon">
            ${product.icon}
          </div>

          <main>

            <strong>
              ${product.name}
            </strong>

            <div class="quantity">

              <button
                onclick="changeQuantity(
                  ${product.id},
                  -1
                )"
              >
                −
              </button>

              <span>
                ${item.quantity}
              </span>

              <button
                onclick="changeQuantity(
                  ${product.id},
                  1
                )"
              >
                +
              </button>

            </div>

          </main>

        </div>

      `;

    }).join("");

}


function openCart() {

  $("#cartDrawer")
    .classList
    .add("open");

}


function closeCart() {

  $("#cartDrawer")
    .classList
    .remove("open");

}


$("#cartButton")
  .addEventListener(
    "click",
    openCart
  );


$("#closeCart")
  .addEventListener(
    "click",
    closeCart
  );


$("#cartDrawer")
  .addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "cartDrawer"
      ) {
        closeCart();
      }

    }
  );


$("#searchInput")
  .addEventListener(
    "input",
    renderProducts
  );


$("#categorySelect")
  .addEventListener(
    "change",
    renderProducts
  );


$("#whatsappOrder")
  .addEventListener(
    "click",
    () => {

      if (!cart.length) {

        showToast(
          "Add at least one part first."
        );

        return;

      }


      const note =
        $("#orderNote")
          .value
          .trim();


      const lines =
        cart.map(item => {

          const product =
            products.find(
              p => p.id === item.id
            );

          return (
            `• ${product.name}` +
            ` — Qty: ${item.quantity}`
          );

        }).join("\n");


      const message =
`Hello ARWA,

I would like to make an enquiry/order:

${lines}

${note ? `Note: ${note}\n\n` : ""}
Please confirm availability and price.

Thank you.`;


      const url =
        "https://wa.me/22962347899?text=" +
        encodeURIComponent(message);


      window.open(
        url,
        "_blank",
        "noopener"
      );

    }
  );


$("#menuButton")
  .addEventListener(
    "click",
    () => {

      const nav =
        $("#navigation");

      nav.style.display =
        nav.style.display === "flex"
          ? ""
          : "flex";

    }
  );


$("#year").textContent =
  new Date().getFullYear();


function updateCategoryFilter() {

  const select =
    $("#categorySelect");

  if (!select) return;

  const current =
    select.value;

  const categories =
    [...new Set(
      products
        .map(product => String(product.category || "").trim())
        .filter(Boolean)
    )]
      .sort((a, b) =>
        a.localeCompare(b)
      );

  select.innerHTML = `
    <option value="all">
      All categories
    </option>

    ${categories.map(category => `
      <option value="${category}">
        ${category}
      </option>
    `).join("")}
  `;

  if (
    categories.includes(current)
  ) {
    select.value = current;
  }
}


const originalLoadProducts =
  loadProducts;

loadProducts = async function() {

  await originalLoadProducts();

  updateCategoryFilter();
};


function sendWhatsAppOrder() {
  if (!cart.length) {
    showToast("Your order is empty.");
    return;
  }

  const selectedNumber =
    document.querySelector("#whatsappNumber")?.value ||
    WHATSAPP;

  const items = cart.map(item => {
    const product = products.find(
      p => String(p.id) === String(item.id)
    );

    if (!product) return null;

    return [
      `Product: ${product.name}`,
      `Category: ${product.category || "N/A"}`,
      `Quantity: ${item.quantity}`,
      `Price: ${formatPrice(product.price)}`
    ].join("\n");
  }).filter(Boolean);

  if (!items.length) {
    showToast("Unable to prepare your order.");
    return;
  }

  const note =
    document.querySelector("#orderNote")?.value.trim() || "";

  let message =
    "Hello ARWA, I would like to place an order.\n\n" +
    items.join("\n\n");

  if (note) {
    message += "\n\nOrder note:\n" + note;
  }

  message +=
    "\n\nPlease confirm availability and total price.";

  window.location.href =
    whatsappURL(message, selectedNumber);
}


loadProducts();
renderCart();

/* ARWA LIVE CATALOG SYNC
 * The public store periodically reloads the same catalog
 * managed by the Admin dashboard.
 */
let arwaCatalogSignature = "";

async function syncPublicCatalog() {
  try {
    const response = await fetch("/api/products", {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) return;

    const latest = await response.json();

    const signature = JSON.stringify(latest);

    if (signature !== arwaCatalogSignature) {
      arwaCatalogSignature = signature;
      products = latest;
      updateCategoryFilter();
      renderProducts();
      renderCart();
    }
  } catch (error) {
    console.warn("ARWA catalog sync failed:", error);
  }
}

setInterval(syncPublicCatalog, 5000);



document.addEventListener("DOMContentLoaded", () => {
  const whatsappOrder =
    document.querySelector("#whatsappOrder");

  if (whatsappOrder) {
    whatsappOrder.addEventListener(
      "click",
      sendWhatsAppOrder
    );
  }
});



/* =========================================================
   ARWA PWA INSTALL SYSTEM
   ========================================================= */

let arwaInstallPrompt = null;

function arwaInstallButton() {
  return document.querySelector("#installApp");
}

function showArwaInstallButton() {
  const button = arwaInstallButton();

  if (!button) return;

  if (window.matchMedia("(display-mode: standalone)").matches) {
    button.hidden = true;
    return;
  }

  button.hidden = false;
}

function hideArwaInstallButton() {
  const button = arwaInstallButton();

  if (button) {
    button.hidden = true;
  }
}

/*
 * Chrome / Edge / Android browsers fire this when
 * the site is considered installable.
 */
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();

  arwaInstallPrompt = event;

  showArwaInstallButton();

  console.log("ARWA install prompt available.");
});

/*
 * Native installation completed.
 */
window.addEventListener("appinstalled", () => {
  arwaInstallPrompt = null;
  hideArwaInstallButton();

  console.log("ARWA installed.");
});

async function installArwa() {
  if (!arwaInstallPrompt) {
    alert(
      "ARWA can be installed from your browser menu. " +
      "Open the browser menu and choose " +
      "\"Install app\" or \"Add to Home screen\"."
    );
    return;
  }

  try {
    arwaInstallPrompt.prompt();

    const result =
      await arwaInstallPrompt.userChoice;

    console.log(
      "ARWA install result:",
      result.outcome
    );

  } catch (error) {
    console.error(
      "ARWA installation failed:",
      error
    );
  }

  arwaInstallPrompt = null;
  hideArwaInstallButton();
}

document.addEventListener("DOMContentLoaded", () => {
  const button = arwaInstallButton();

  if (!button) return;

  button.addEventListener(
    "click",
    installArwa
  );

  /*
   * If already installed as a standalone app,
   * keep the button hidden.
   */
  if (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  ) {
    hideArwaInstallButton();
  }
});

/*
 * Register service worker.
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration =
        await navigator.serviceWorker.register(
          "/sw.js",
          { scope: "/" }
        );

      console.log(
        "ARWA service worker:",
        registration.scope
      );

      /*
       * Check for updates.
       */
      registration.update();

    } catch (error) {
      console.error(
        "ARWA service worker registration failed:",
        error
      );
    }
  });
}
