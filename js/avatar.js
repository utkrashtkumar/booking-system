/**
 * IET LUCKNOW - MCA FRESHERS 2026 PLATFORM
 * Avatar & Profile Picture Customization Module (Post-Payment Popup)
 */

let selectedAvatarUrl = "assets/avatars/av1.svg";
let selectedAvatarType = "preset"; // 'preset' or 'upload'
let uploadedAvatarFile = null;

// 12 Avatar Catalog with Titles & Gender hints
const AVATAR_CATALOG = [
  { id: "av1", name: "Cyber Dev", file: "assets/avatars/av1.svg", gender: "male" },
  { id: "av2", name: "Code Ninja", file: "assets/avatars/av2.svg", gender: "male" },
  { id: "av3", name: "AI Architect", file: "assets/avatars/av3.svg", gender: "male" },
  { id: "av4", name: "Cloud Hacker", file: "assets/avatars/av4.svg", gender: "male" },
  { id: "av5", name: "Quantum Dev", file: "assets/avatars/av5.svg", gender: "male" },
  { id: "av6", name: "Pixel Punk", file: "assets/avatars/av6.svg", gender: "male" },
  { id: "av7", name: "Cyber Queen", file: "assets/avatars/av7.svg", gender: "female" },
  { id: "av8", name: "Code Sorceress", file: "assets/avatars/av8.svg", gender: "female" },
  { id: "av9", name: "UI Diva", file: "assets/avatars/av9.svg", gender: "female" },
  { id: "av10", name: "Data Diva", file: "assets/avatars/av10.svg", gender: "female" },
  { id: "av11", name: "Quantum Star", file: "assets/avatars/av11.svg", gender: "female" },
  { id: "av12", name: "Web3 Diva", file: "assets/avatars/av12.svg", gender: "female" }
];

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("avatar-modal");
  const modalClose = document.getElementById("avatar-modal-close");
  const openModalBtn = document.getElementById("open-avatar-modal-btn");
  const tabUploadBtn = document.getElementById("avatar-tab-upload-btn");
  const tabPresetBtn = document.getElementById("avatar-tab-preset-btn");
  const tabUploadContent = document.getElementById("avatar-tab-upload");
  const tabPresetContent = document.getElementById("avatar-tab-preset");
  const fileInput = document.getElementById("avatar-file-input");
  const browseBtn = document.getElementById("avatar-browse-btn");
  const uploadPreview = document.getElementById("avatar-upload-preview");
  const gridContainer = document.getElementById("avatar-grid-container");
  const saveBtn = document.getElementById("avatar-save-btn");
  const skipBtn = document.getElementById("avatar-skip-btn");

  // Global trigger function called after payment submission
  window.openAvatarModal = function () {
    if (modal) {
      modal.classList.add("active");
      populateAvatarGrid();
      if (currentProfile && currentProfile.avatar_url) {
        uploadPreview.src = currentProfile.avatar_url;
      }
    }
  };

  function closeAvatarModal() {
    if (modal) modal.classList.remove("active");
  }

  if (modalClose) modalClose.addEventListener("click", closeAvatarModal);
  if (skipBtn) skipBtn.addEventListener("click", closeAvatarModal);
  if (openModalBtn) openModalBtn.addEventListener("click", window.openAvatarModal);

  // Switch between Upload tab & Preset Avatar tab
  if (tabUploadBtn && tabPresetBtn) {
    tabUploadBtn.addEventListener("click", () => {
      tabUploadBtn.style.background = "var(--primary)";
      tabUploadBtn.style.color = "#ffffff";
      tabPresetBtn.style.background = "transparent";
      tabPresetBtn.style.color = "var(--text-muted)";
      tabUploadContent.style.display = "block";
      tabPresetContent.style.display = "none";
    });

    tabPresetBtn.addEventListener("click", () => {
      tabPresetBtn.style.background = "var(--primary)";
      tabPresetBtn.style.color = "#ffffff";
      tabUploadBtn.style.background = "transparent";
      tabUploadBtn.style.color = "var(--text-muted)";
      tabPresetContent.style.display = "block";
      tabUploadContent.style.display = "none";
      populateAvatarGrid();
    });
  }

  // Browse File Action
  if (browseBtn && fileInput) {
    browseBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 3 * 1024 * 1024) {
        alert("Image file size should be less than 3MB.");
        fileInput.value = "";
        return;
      }

      uploadedAvatarFile = file;
      selectedAvatarType = "upload";

      const reader = new FileReader();
      reader.onload = (event) => {
        uploadPreview.src = event.target.result;
        selectedAvatarUrl = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Populate 12 Avatars Grid
  function populateAvatarGrid() {
    if (!gridContainer) return;
    gridContainer.innerHTML = "";

    const userGender = (currentProfile && currentProfile.gender) ? currentProfile.gender : "prefer_not_to_say";

    // Sort avatars: prioritize matching gender
    const sortedAvatars = [...AVATAR_CATALOG].sort((a, b) => {
      if (userGender === "male") {
        return a.gender === "male" ? -1 : 1;
      } else if (userGender === "female") {
        return a.gender === "female" ? -1 : 1;
      }
      return 0;
    });

    sortedAvatars.forEach((av) => {
      const card = document.createElement("div");
      card.className = "avatar-preset-item";
      card.style.cssText = `
        text-align: center;
        background: var(--bg-surface);
        border: 2px solid var(--border-glass);
        border-radius: 12px;
        padding: 0.6rem 0.4rem;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      card.innerHTML = `
        <img src="${av.file}" alt="${av.name}" style="width: 54px; height: 54px; border-radius: 50%; display: block; margin: 0 auto 0.4rem;">
        <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${av.name}</div>
      `;

      // Check if this is the currently selected
      if (currentProfile && currentProfile.avatar_url === av.file) {
        card.style.borderColor = "var(--cyan)";
        card.style.boxShadow = "0 0 15px var(--cyan-glow)";
      }

      card.addEventListener("click", () => {
        // Deselect others
        document.querySelectorAll(".avatar-preset-item").forEach(c => {
          c.style.borderColor = "var(--border-glass)";
          c.style.boxShadow = "none";
        });

        // Select this
        card.style.borderColor = "var(--cyan)";
        card.style.boxShadow = "0 0 15px var(--cyan-glow)";

        selectedAvatarUrl = av.file;
        selectedAvatarType = "preset";
        uploadedAvatarFile = null;
        uploadPreview.src = av.file;
      });

      gridContainer.appendChild(card);
    });
  }

  // Save Avatar Selection
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving to Pass...";

      try {
        const supabase = getSupabase();
        let finalAvatarUrl = selectedAvatarUrl;

        // If user uploaded a custom photo, upload it to Supabase Storage 'avatars'
        if (selectedAvatarType === "upload" && uploadedAvatarFile) {
          const fileExt = uploadedAvatarFile.name.split('.').pop();
          const filePath = `${currentStudent.id}/avatar_${Date.now()}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, uploadedAvatarFile, {
              upsert: true,
              contentType: uploadedAvatarFile.type
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("avatars")
              .getPublicUrl(filePath);
            finalAvatarUrl = publicUrl;
          }
        }

        // Update profile in database
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            avatar_url: finalAvatarUrl,
            avatar_type: selectedAvatarType
          })
          .eq("id", currentStudent.id);

        if (updateError) {
          console.warn("Avatar update note:", updateError.message);
        }

        // Update UI
        if (currentProfile) {
          currentProfile.avatar_url = finalAvatarUrl;
        }

        const navAvatar = document.getElementById("nav-avatar-img");
        if (navAvatar) navAvatar.src = finalAvatarUrl;

        alert("✅ Profile picture updated successfully! It will appear on your entry pass.");
        closeAvatarModal();

      } catch (err) {
        console.error("Avatar save error:", err);
        alert("Could not update avatar: " + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save to My Pass";
      }
    });
  }
});
