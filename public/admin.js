let token =
  localStorage.getItem("arwaAdminToken");

const $ = selector =>
  document.querySelector(selector);


function authHeaders() {

  return {
    "Content-Type":
      "application/json",

    "Authorization":
      `Bearer ${token}`
  };

}


function showDashboard() {

  $("#loginScreen")
    .classList
    .add("hidden");

  $("#dashboard")
    .classList
    .remove("hidden");

  loadStats();

}


function showLogin() {

  $("#dashboard")
    .classList
    .add("hidden");

  $("#loginScreen")
    .classList
    .remove("hidden");

}


async function login(event) {

  event.preventDefault();

  const username =
    $("#username").value.trim();

  const password =
    $("#password").value;


  const response =
    await fetch(
      "/api/admin/login",
      {
        method:"POST",
        headers:{
          "Content-Type":
            "application/json"
        },
        body:JSON.stringify({
          username,
          password
        })
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    $("#loginError")
      .textContent =
      data.error ||
      "Login failed.";

    return;

  }


  token = data.token;

  localStorage.setItem(
    "arwaAdminToken",
    token
  );

  showDashboard();

}


$("#loginForm")
  .addEventListener(
    "submit",
    login
  );


$("#logout")
  .addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        "arwaAdminToken"
      );

      token = null;

      showLogin();

    }
  );


async function api(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        ...options,
        headers:{
          ...authHeaders(),
          ...(options.headers || {})
        }
      }
    );


  if (
    response.status === 401
  ) {

    localStorage.removeItem(
      "arwaAdminToken"
    );

    token = null;

    showLogin();

    throw new Error(
      "Authentication expired"
    );

  }


  return response;

}


async function loadStats() {

  const response =
    await api(
      "/api/admin/stats"
    );

  const data =
    await response.json();


  $("#statProducts")
    .textContent =
    data.products;

  $("#statOrders")
    .textContent =
    data.orders;

  $("#statNew")
    .textContent =
    data.newOrders;

  $("#statSubscribers")
    .textContent =
    data.subscribers;

}


async function loadProducts() {

  const response =
    await api("/api/admin/products");

  const products =
    await response.json();

  $("#productsTable").innerHTML = `

    <div class="inventory-toolbar">

      <strong>
        ${products.length} product${products.length === 1 ? "" : "s"}
      </strong>

      <button
        type="button"
        onclick="loadProducts()"
      >
        Refresh
      </button>

    </div>

    <div class="inventory-grid">

      ${products.length

        ? products.map(product => `

          <article class="inventory-card">

            <div class="inventory-image">

              ${
                product.image
                  ? `
                    <img
                      src="${escapeHtml(product.image)}"
                      alt="${escapeHtml(product.name)}"
                    >
                  `
                  : `
                    <span>⚙</span>
                  `
              }

            </div>

            <div class="inventory-info">

              <div class="inventory-top">

                <span class="inventory-category">
                  ${escapeHtml(product.category)}
                </span>

                <span class="
                  inventory-status
                  ${product.active ? "active" : "hidden-status"}
                ">
                  ${product.active ? "ACTIVE" : "HIDDEN"}
                </span>

              </div>

              <h3>
                ${escapeHtml(product.name)}
              </h3>

              <p>
                ${escapeHtml(product.description || "No description")}
              </p>

              <div class="inventory-meta">

                <strong>
                  ${
                    product.price === null ||
                    product.price === undefined
                      ? "Contact for price"
                      : Number(product.price).toLocaleString() + " XOF"
                  }
                </strong>

                <span>
                  ${
                    Number(product.stock) > 0
                      ? `${product.stock} in stock`
                      : "Out of stock"
                  }
                </span>

              </div>

              <small>
                ID: ${escapeHtml(product.id)}
              </small>

              <div class="inventory-actions">

                <button
                  type="button"
                  onclick="editProduct('${escapeHtml(product.id)}')"
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  onclick="toggleProduct('${escapeHtml(product.id)}', ${product.active})"
                >
                  ${
                    product.active
                      ? "Hide"
                      : "Show"
                  }
                </button>

                <button
                  type="button"
                  class="danger"
                  onclick="deleteProduct('${escapeHtml(product.id)}')"
                >
                  🗑 Delete
                </button>

              </div>

            </div>

          </article>

        `).join("")

        : `
          <div class="empty-inventory">
            <strong>No products yet.</strong>
            <p>Add your first machine part.</p>
          </div>
        `
      }

    </div>

  `;

}


window.editProduct =
async function(id) {

  const response =
    await api("/api/admin/products");

  const products =
    await response.json();

  const product =
    products.find(item => item.id === id);

  if (!product) {
    alert("Product not found.");
    return;
  }

  const name =
    prompt(
      "Product name:",
      product.name || ""
    );

  if (name === null) return;

  const category =
    prompt(
      "Category:",
      product.category || ""
    );

  if (category === null) return;

  const description =
    prompt(
      "Description:",
      product.description || ""
    );

  if (description === null) return;

  const price =
    prompt(
      "Price in XOF:",
      product.price ?? ""
    );

  if (price === null) return;

  const stock =
    prompt(
      "Stock quantity:",
      product.stock ?? 0
    );

  if (stock === null) return;

  const response2 =
    await api(
      `/api/admin/products/${encodeURIComponent(id)}`,
      {
        method: "PUT",

        body: JSON.stringify({
          name,
          category,
          description,
          price:
            price.trim() === ""
              ? null
              : Number(price),
          stock:
            Number(stock)
        })
      }
    );

  const data =
    await response2.json();

  if (!response2.ok) {
    alert(
      data.error ||
      "Could not update product."
    );
    return;
  }

  alert("Product updated successfully.");

  loadProducts();
  loadStats();

};


window.toggleProduct =
async function(id, active) {

  const response =
    await api(
      `/api/admin/products/${encodeURIComponent(id)}`,
      {
        method: "PUT",

        body: JSON.stringify({
          active: !active
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    alert(
      data.error ||
      "Could not change product status."
    );
    return;
  }

  loadProducts();
  loadStats();

};


window.deleteProduct =
async function(id) {

  if (
    !confirm(
      "Hide this product from the public store?"
    )
  ) {
    return;
  }

  const response =
    await api(
      `/api/admin/products/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    alert(
      data.error ||
      "Could not remove product."
    );
    return;
  }

  loadProducts();
  loadStats();

};


async function loadOrders() {

  const response =
    await api(
      "/api/admin/orders"
    );

  const orders =
    await response.json();


  $("#ordersTable").innerHTML =
    orders.length

      ? `

        <table>

          <thead>

            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            ${orders.map(order => `

              <tr>

                <td>
                  <strong>
                    ${order.id}
                  </strong>
                  <br>
                  <small>
                    ${new Date(
                      order.createdAt
                    ).toLocaleString()}
                  </small>
                </td>

                <td>
                  ${escapeHtml(
                    order.customer.name
                  )}
                  <br>
                  ${escapeHtml(
                    order.customer.phone
                  )}
                </td>

                <td>
                  ${order.items.length}
                </td>

                <td>

                  <select
                    onchange="
                      updateOrderStatus(
                        '${order.id}',
                        this.value
                      )
                    "
                  >

                    ${[
                      "new",
                      "confirmed",
                      "processing",
                      "completed",
                      "cancelled"
                    ].map(status => `

                      <option
                        value="${status}"
                        ${
                          order.status === status
                            ? "selected"
                            : ""
                        }
                      >
                        ${status}
                      </option>

                    `).join("")}

                  </select>

                </td>

              </tr>

            `).join("")}

          </tbody>

        </table>

      `

      : `
        <p>
          No orders yet.
        </p>
      `;

}


window.updateOrderStatus =
async function(id,status) {

  await api(
    `/api/admin/orders/${id}`,
    {
      method:"PATCH",
      body:JSON.stringify({
        status
      })
    }
  );

  loadOrders();
  loadStats();

};


async function loadPosts() {

  const response =
    await api("/api/posts");

  const posts =
    await response.json();

  $("#postsList").innerHTML =
    posts.length

      ? posts.map(post => `

        <article
          style="
            padding:20px 0;
            border-bottom:
              1px solid #28313a;
          "
        >

          ${
            post.image
              ? `
                <img
                  src="${escapeHtml(post.image)}"
                  alt="${escapeHtml(post.title)}"
                  style="
                    width:100%;
                    max-width:520px;
                    aspect-ratio:16/10;
                    object-fit:cover;
                    border-radius:14px;
                    display:block;
                    margin-bottom:15px;
                  "
                >
              `
              : ""
          }

          <h3>
            ${escapeHtml(post.title)}
          </h3>

          ${
            post.category
              ? `
                <div>
                  <strong>Category:</strong>
                  ${escapeHtml(post.category)}
                </div>
              `
              : ""
          }

          ${
            post.price
              ? `
                <div>
                  <strong>Price:</strong>
                  ${escapeHtml(post.price)}
                </div>
              `
              : ""
          }

          <p>
            ${escapeHtml(post.content)}
          </p>

          <small>
            Published:
            ${new Date(
              post.createdAt
            ).toLocaleString()}
          </small>

          <div
            style="
              display:flex;
              gap:10px;
              flex-wrap:wrap;
              margin-top:15px;
            "
          >

            <button
              type="button"
              onclick="editPost('${escapeHtml(post.id)}')"
            >
              ✏️ Edit
            </button>

            <button
              type="button"
              onclick="deletePost('${escapeHtml(post.id)}')"
            >
              🗑️ Delete
            </button>

          </div>

        </article>

      `).join("")

      : "<p>No posts yet.</p>";
}


async function editPost(id) {

  const response =
    await api("/api/posts");

  const posts =
    await response.json();

  const post =
    posts.find(item => item.id === id);

  if (!post) {
    alert("Post not found.");
    return;
  }

  const title =
    prompt(
      "Product / post title:",
      post.title || ""
    );

  if (title === null)
    return;

  const category =
    prompt(
      "Category:",
      post.category || ""
    );

  if (category === null)
    return;

  const price =
    prompt(
      "Price:",
      post.price || ""
    );

  if (price === null)
    return;

  const content =
    prompt(
      "Description:",
      post.content || ""
    );

  if (content === null)
    return;

  const formData =
    new FormData();

  formData.append("title", title);
  formData.append("category", category);
  formData.append("price", price);
  formData.append("content", content);

  const response2 =
    await fetch(
      `/api/admin/posts/${encodeURIComponent(id)}`,
      {
        method: "PATCH",

        headers: {
          "Authorization":
            `Bearer ${token}`
        },

        body: formData
      }
    );

  const data =
    await response2.json();

  if (!response2.ok) {
    alert(
      data.error ||
      "Could not update post."
    );
    return;
  }

  alert("Post updated successfully.");

  loadPosts();
}


async function deletePost(id) {

  const confirmed =
    confirm(
      "Delete this post permanently?"
    );

  if (!confirmed)
    return;

  const response =
    await fetch(
      `/api/admin/posts/${encodeURIComponent(id)}`,
      {
        method: "DELETE",

        headers: {
          "Authorization":
            `Bearer ${token}`
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    alert(
      data.error ||
      "Could not delete post."
    );
    return;
  }

  alert("Post deleted successfully.");

  loadPosts();

}


async function loadSubscribers() {

  const response =
    await api(
      "/api/admin/subscribers"
    );

  const subscribers =
    await response.json();


  $("#subscribersTable").innerHTML =
    subscribers.length

      ? `

        <table>

          <thead>

            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Date</th>
            </tr>

          </thead>

          <tbody>

            ${subscribers.map(
              subscriber => `

              <tr>

                <td>
                  ${escapeHtml(
                    subscriber.name
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    subscriber.phone
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    subscriber.email
                  )}
                </td>

                <td>
                  ${new Date(
                    subscriber.createdAt
                  ).toLocaleDateString()}
                </td>

              </tr>

            `
            ).join("")}

          </tbody>

        </table>

      `

      : "<p>No subscribers yet.</p>";

}


$("#postForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const formData =
        new FormData();

      const image =
        $("#postImage").files[0];

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      formData.append(
        "title",
        $("#postTitle").value.trim()
      );

      formData.append(
        "category",
        $("#postCategory").value.trim()
      );

      formData.append(
        "price",
        $("#postPrice").value.trim()
      );

      formData.append(
        "content",
        $("#postContent").value.trim()
      );

      const response =
        await fetch(
          "/api/admin/posts",
          {
            method: "POST",

            headers: {
              "Authorization":
                `Bearer ${token}`
            },

            body: formData
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
          "Could not publish post."
        );
        return;
      }

      $("#postForm").reset();

      alert(
        "Product post published successfully."
      );

      loadPosts();

    }
  );




$("#addProduct")
  .addEventListener(
    "click",
    () =>
      $("#modal")
        .classList
        .remove("hidden")
  );


$("#closeModal")
  .addEventListener(
    "click",
    () =>
      $("#modal")
        .classList
        .add("hidden")
  );


$("#productForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const formData =
        new FormData();

      const image =
        $("#productImage").files[0];

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      formData.append(
        "name",
        $("#productName").value.trim()
      );

      formData.append(
        "category",
        $("#productCategory").value.trim()
      );

      formData.append(
        "description",
        $("#productDescription").value.trim()
      );

      formData.append(
        "price",
        $("#productPrice").value.trim()
      );

      formData.append(
        "stock",
        $("#productStock").value
      );

      const response =
        await fetch(
          "/api/admin/products",
          {
            method: "POST",

            headers: {
              "Authorization":
                `Bearer ${token}`
            },

            body: formData
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
          "Could not create product."
        );
        return;
      }

      $("#productForm").reset();

      $("#modal")
        .classList
        .add("hidden");

      loadProducts();
      loadStats();

      alert(
        "Product created successfully."
      );
    }
  );



document
  .querySelectorAll(
    ".sidebar button[data-page]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const page =
          button.dataset.page;

        document
          .querySelectorAll(".page")
          .forEach(
            p =>
              p.classList
                .add("hidden")
          );

        $(`#${page}Page`)
          .classList
          .remove("hidden");

        $("#pageTitle")
          .textContent =
          button.textContent.trim();


        if (page === "products")
          loadProducts();

        if (page === "orders")
          loadOrders();

        if (page === "posts")
          loadPosts();

        if (page === "subscribers")
          loadSubscribers();

        if (page === "overview")
          loadStats();

      }
    );

  });


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


if (token) {

  showDashboard();

} else {

  showLogin();

}
