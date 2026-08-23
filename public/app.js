const products = [

  {
    id: 1,
    name: "Industrial Bearing",
    category: "Bearings",
    icon: "◉",
    description: "Heavy-duty replacement bearing."
  },

  {
    id: 2,
    name: "Drive Belt",
    category: "Belts",
    icon: "◌",
    description: "Durable transmission belt."
  },

  {
    id: 3,
    name: "Hydraulic Filter",
    category: "Filters",
    icon: "▤",
    description: "Replacement hydraulic filtration."
  },

  {
    id: 4,
    name: "Oil Seal",
    category: "Seals",
    icon: "◎",
    description: "Sealing component for machinery."
  },

  {
    id: 5,
    name: "Engine Component",
    category: "Engine",
    icon: "⚙",
    description: "Replacement engine component."
  },

  {
    id: 6,
    name: "Hydraulic Coupling",
    category: "Hydraulic",
    icon: "⛓",
    description: "Strong hydraulic connection."
  },

  {
    id: 7,
    name: "Machine Switch",
    category: "Electrical",
    icon: "⌁",
    description: "Industrial electrical replacement."
  },

  {
    id: 8,
    name: "Pulley Assembly",
    category: "Belts",
    icon: "◉",
    description: "Machine drive pulley component."
  }

];


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

  const existing =
    cart.find(item => item.id === id);

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


function renderProducts() {

  const search =
    $("#searchInput")
      .value
      .trim()
      .toLowerCase();

  const category =
    $("#categorySelect").value;


  const filtered =
    products.filter(product => {

      const matchesSearch =
        `${product.name} ${product.description}`
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        category === "all" ||
        product.category === category;

      return matchesSearch &&
        matchesCategory;

    });


  $("#productsGrid").innerHTML =
    filtered.length

      ? filtered.map(product => `

        <article class="product">

          <div class="product-image">
            ${product.icon}
          </div>

          <div class="product-body">

            <div class="product-category">
              ${product.category}
            </div>

            <h3>
              ${product.name}
            </h3>

            <p>
              ${product.description}
            </p>

            <button
              class="button primary"
              onclick="addToCart(${product.id})"
            >
              Add to order
            </button>

          </div>

        </article>

      `).join("")

      : `
        <p style="color:#9aa3ad">
          No matching parts found.
        </p>
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


renderProducts();
renderCart();
