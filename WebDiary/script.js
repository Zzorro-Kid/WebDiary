document.addEventListener('DOMContentLoaded', () => {
  const firebaseConfig = {
    apiKey: "AIzaSyD3tipM65N8GjYWWd841eumenklLJzSMe0", 
    authDomain: "mywebdiary-5f120.firebaseapp.com", 
    projectId: "mywebdiary-5f120",
    storageBucket: "mywebdiary-5f120.firebasestorage.app", 
    messagingSenderId: "740286325330", 
    appId: "1:740286325330:web:66867af24c258348d6b58b" 
  };

  const app = firebase.initializeApp(firebaseConfig);

  const database = app.database("https://mywebdiary-5f120-default-rtdb.europe-west1.firebasedatabase.app");
  
  const entriesRef = database.ref('diaryEntries');

  const auth = firebase.auth();

  const form = document.getElementById('entryForm');
  const entriesContainer = document.getElementById('entries');
  const fileInput = document.getElementById('imageInput');
  const fileStatus = document.getElementById('fileStatus');
  const submitBtn = form.querySelector('button[type="submit"]');

  const authSection = document.createElement('div');
  authSection.id = 'authSection';
  authSection.innerHTML = `
    <h2 style="color: var(--text); margin-bottom: 1rem;">Author</h2>
    <input type="email" id="authorEmail" placeholder="Email" style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: var(--radius); border: 1px solid var(--border); background-color: var(--card-bg); color: var(--text);">
    <input type="password" id="authorPassword" placeholder="Password" style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: var(--radius); border: 1px solid var(--border); background-color: var(--card-bg); color: var(--text);">
    <button id="signInBtn" style="background-color: var(--accent); color: white; border: none; padding: 10px 16px; font-size: 0.95rem; border-radius: var(--radius); cursor: pointer; transition: background 0.2s; margin-right: 10px;">Log in</button>
    <button id="signOutBtn" style="background-color: #dc3545; color: white; border: none; padding: 10px 16px; font-size: 0.95rem; border-radius: var(--radius); cursor: pointer; transition: background 0.2s; display: none;">Log out</button>
    <p id="authStatus" style="color: #a1a1aa; font-size: 0.85rem; margin-top: 10px;"></p>
  `;
  document.querySelector('.container').insertBefore(authSection, form);

  const authorEmailInput = document.getElementById('authorEmail');
  const authorPasswordInput = document.getElementById('authorPassword');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const authStatus = document.getElementById('authStatus');

  form.style.display = 'none';
 
  document.querySelectorAll('.edit-btn, .delete-btn').forEach(btn => {
    btn.style.display = 'none';
  });

  loadEntries();

  fileInput.addEventListener('change', (e) => {
    fileStatus.textContent = e.target.files[0] ? e.target.files[0].name : 'File not selected';
  });

  form.addEventListener('submit', handleSubmit);

  function handleSubmit(e) {
    e.preventDefault();
      if (!auth.currentUser) {
        alert('You must be logged in to add or edit entries.');
      return;
    }

    const text = form.querySelector('textarea').value.trim();
    if (!text) return;

    const file = fileInput.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        saveEntry(text, e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      saveEntry(text, null);
    }
  }

  function saveEntry(text, imageData) {

    if (!auth.currentUser) {
      console.error("The user is not authorized to make a post.");
      return;
    }

    if (submitBtn.textContent === 'Update a post') {
      const keyToUpdate = submitBtn.dataset.editKey;
      if (keyToUpdate) {
        entriesRef.child(keyToUpdate).update({
          text,
          image: imageData
        }).then(() => {
          console.log("The post has been successfully updated!");
          resetForm();
        }).catch(error => {
          console.error("Error when updating a post:", error);
          alert("Error when adding a post: " + error.message);
        });
      }
    } else {
      const newEntryRef = entriesRef.push();
      newEntryRef.set({
        text,
        image: imageData,
        date: new Date().toISOString()
      }).then(() => {
        console.log("Post successfully added");
        resetForm();
      }).catch(error => {
        console.error("Error when adding a post:", error);
        alert("Error when adding a post: " + error.message);
      });
    }
  }

  function resetForm() {
    form.reset();
    submitBtn.textContent = 'Add a post';
    delete submitBtn.dataset.editKey;
    fileStatus.textContent = 'File not selected';
  }

  function loadEntries() {
    entriesRef.on('value', (snapshot) => {
      entriesContainer.innerHTML = '';

      const entriesData = snapshot.val();
      if (entriesData) {
        const entriesArray = Object.keys(entriesData).map(key => ({
          key: key,
          ...entriesData[key]
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        entriesArray.forEach((entry) => {
          const entryElement = document.createElement('div');
          entryElement.className = 'entry';

          const date = new Date(entry.date);
          const dateString = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          entryElement.innerHTML = `
            <p>${entry.text}</p>
            ${entry.image ? `<img src="${entry.image}" alt="Attached image">` : ''}
            <div class="entry-footer">
              <span class="entry-date">${dateString}</span>
              <div class="entry-actions">
                <button class="edit-btn" data-key="${entry.key}">Edit</button>
                <button class="delete-btn" data-key="${entry.key}">Delete</button>
              </div>
            </div>
          `;

          entriesContainer.appendChild(entryElement);
        });
      }

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteEntry);

        if (!auth.currentUser) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'inline-block';
        }
      });

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', editEntry);
        if (!auth.currentUser) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'inline-block';
        }
      });
    });
  }

  function deleteEntry(e) {

    if (!auth.currentUser) {
      alert('You must be logged in to delete/edit posts.');
      return;
    }

    const keyToDelete = e.target.dataset.key;
    if (keyToDelete) {
      entriesRef.child(keyToDelete).remove()
        .then(() => {
          console.log("Post successfully deleted!");
        }).catch(error => {
          console.error("Error when deleting a post:", error);
          alert("Error when deleting a post: " + error.message);
        });
    }
  }
  
  function editEntry(e) {
  
    if (!auth.currentUser) {
      alert('You must be logged in to delete/edit posts.');
      return;
    }

    const keyToEdit = e.target.dataset.key;

    entriesRef.child(keyToEdit).once('value', (snapshot) => {
      const entry = snapshot.val();
      if (entry) {
        form.querySelector('textarea').value = entry.text;
        submitBtn.textContent = 'Update a post';
        submitBtn.dataset.editKey = keyToEdit;

        fileInput.value = ''; 
        fileStatus.textContent = 'File not selected'; 
        
      }
    });
  }

  signInBtn.addEventListener('click', () => {
    const email = authorEmailInput.value;
    const password = authorPasswordInput.value;

    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        authStatus.textContent = `You logged as: ${user.email}`;
        authorEmailInput.value = '';
        authorPasswordInput.value = '';
        console.log("The user is logged in:", user.email);
      })
      .catch((error) => {
        authStatus.textContent = `Login error: ${error.message}`;
        console.error("Login error:", error);
      });
  });

  signOutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      authStatus.textContent = 'You logged out.';
      console.log("The user is logged out.");
    }).catch((error) => {
      console.error("Exit error:", error);
    });
  });

  auth.onAuthStateChanged((user) => {
    if (user) {

      authStatus.textContent = `You logged as: ${user.email}`;
      signInBtn.style.display = 'none';
      signOutBtn.style.display = 'inline-block';
      form.style.display = 'flex'; 
      
      document.querySelectorAll('.edit-btn, .delete-btn').forEach(btn => {
        btn.style.display = 'inline-block';
      });

    } else {
      authStatus.textContent = 'You are not authorized.';
      signInBtn.style.display = 'inline-block';
      signOutBtn.style.display = 'none';
      form.style.display = 'none';
      
      document.querySelectorAll('.edit-btn, .delete-btn').forEach(btn => {
        btn.style.display = 'none';
      });
    }
  });
});