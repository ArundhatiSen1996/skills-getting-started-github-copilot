document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape text for insertion into HTML
  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select options
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants list HTML (escape content) with delete button for each participant
        const participantsHtml =
          details.participants && details.participants.length > 0
            ? details.participants
                .map(
                  (p) =>
                    `<li><span class="participant-pill">${escapeHtml(p)}</span><button class="delete-btn" data-activity="${escapeHtml(
                      name
                    )}" data-email="${escapeHtml(p)}" aria-label="Remove ${escapeHtml(p)}">×</button></li>`
                )
                .join("")
            : `<li class="no-participants">No participants yet</li>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <strong>Participants:</strong>
            <ul class="participants-list">
              ${participantsHtml}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Helper to add a newly signed up participant to the DOM without a full refetch
  function addParticipantToDOM(activityName, email) {
    // Find the activity card by matching the h4 text
    const cards = Array.from(document.querySelectorAll('.activity-card'));
    const card = cards.find(c => c.querySelector('h4') && c.querySelector('h4').textContent === activityName);
    if (!card) return;

    const participantsList = card.querySelector('.participants-list');
    if (!participantsList) return;

    // Remove "No participants yet" hint if present
    const noPart = participantsList.querySelector('.no-participants');
    if (noPart) noPart.remove();

    // Create list item with pill and delete button
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '8px';

    const span = document.createElement('span');
    span.className = 'participant-pill';
    span.textContent = email;

    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.setAttribute('data-activity', activityName);
    btn.setAttribute('data-email', email);
    btn.setAttribute('aria-label', `Remove ${email}`);
    btn.textContent = '×';

    li.appendChild(span);
    li.appendChild(btn);
    participantsList.appendChild(li);

    // Update availability text if present
    const availabilityP = Array.from(card.querySelectorAll('p')).find(p => p.textContent.includes('Availability:'));
    if (availabilityP) {
      // Extract numeric spots left and decrement by 1 if possible
      const match = availabilityP.textContent.match(/Availability:\s*(\d+)\s*spots left/);
      if (match) {
        const current = parseInt(match[1], 10);
        if (!isNaN(current) && current > 0) {
          availabilityP.innerHTML = `<strong>Availability:</strong> ${current - 1} spots left`;
        }
      }
    }
  }

    // Event delegation for delete buttons next to participants
    activitiesList.addEventListener("click", async (e) => {
      const btn = e.target.closest(".delete-btn");
      if (!btn) return;

      const activity = btn.dataset.activity;
      const email = btn.dataset.email;

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );

        const result = await response.json();

        if (response.ok) {
          messageDiv.textContent = result.message || "Participant removed";
          messageDiv.className = "message success";
          // refresh activities to reflect removal
          fetchActivities();
        } else {
          messageDiv.textContent = result.detail || "Failed to remove participant";
          messageDiv.className = "message error";
        }

        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 4000);
      } catch (err) {
        console.error("Error removing participant:", err);
        messageDiv.textContent = "Failed to remove participant. Please try again.";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 4000);
      }
    });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Update the DOM immediately so the user doesn't need to refresh
        try {
          addParticipantToDOM(activity, email);
        } catch (err) {
          // fallback to refetch if DOM update fails for any reason
          fetchActivities();
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
