$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navUserProfile = $("#nav-user-profile")
  const $favoritedStories = $("#favorited-articles");
  const $navWelcome = $("#nav-welcome");
  const $navSubmit = $("#nav-submit-story");
  const $userProfile = $("#user-profile");
  const $body = $("body");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  $loginForm.on("submit", async function (evt) {
    // Listener for logging in
    // If successful, setup user instance
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");
  });

  $createAccountForm.on("submit", async function (evt) {
    // Event listener for signing up
    // If successful, setup new user user instance    
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");
  });

  $navLogOut.on("click", function () {
    // Log out functionality    
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  $navLogin.on("click", function () {
    // Event Handler for Clicking Login
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  $navSubmit.on("click", function () {
    if (currentUser) {
      hideElements();
      $allStoriesList.show();
      $submitForm.slideToggle();
    }
  });

  $submitForm.on("submit", async function (evt) {
    evt.preventDefault(); // do not reload the page

    // grab info from the form
    const title = $("#title").val();
    const url = $("#url").val();
    const hostName = getHostName(url);
    const author = $("#author").val();
    const username = currentUser.username

    const storyObject = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username
    });

    // generate markup for the new story
    const $li = $(`
      <li id="${storyObject.storyId}" class="id-${storyObject.storyId}">
        <span class="star">
          <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${url}" target="a_blank">
          <strong>${title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${author}</small>
        <small class="article-username">posted by ${username}</small>
      </li>
    `);
    $allStoriesList.prepend($li);

    // hide the form and reset it
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  });

  $body.on("click", "#nav-favorites", function () {
    hideElements();
    if (currentUser) {
      generateFaves();
      $favoritedStories.show();
    }
  });

  $("body").on("click", "#nav-all", async function () {
    // Event handler for Navigation to Homepage
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  $body.on("click", "#nav-my-stories", function () {
    // Event handler for Navigation to currentUser's stories
    hideElements();
    if (currentUser) {
      $userProfile.hide();
      generateMyStories();
      $ownStories.show();
    }
  });

  $navUserProfile.on("click", function () {
    if (currentUser) {
      hideElements();
      $userProfile.show();
    }
  });

  $(".articles-container").on("click", ".star", async function (evt) {
    if (currentUser) {
      const $tgt = $(evt.target);
      const $closestLi = $tgt.closest("li");
      const storyId = $closestLi.attr("id");

      // if the item is already favorited
      if ($tgt.hasClass("fas")) {
        // remove the favorite from the user's list
        await currentUser.removeFavorite(storyId);
        // then change the class to be an empty star
        $tgt.closest("i").toggleClass("fas far");
      } else {
        // the item is un-favorited
        await currentUser.addFavorite(storyId);
        $tgt.closest("i").toggleClass("fas far");
      }
    }
  });

  async function checkIfLoggedIn() {
    // On page load, checks local storage to see if the user is already logged in.
    // Renders page information accordingly.
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      generateProfile();
      showNavForLoggedInUser();
    }
  }

  $ownStories.on("click", ".trash-can", async function (evt) {
    // get the Story's ID
    const $closestLi = $(evt.target).closest("li");
    const storyId = $closestLi.attr("id");

    // remove the story from the API
    await storyList.removeStory(currentUser, storyId);

    // re-generate the story list
    await generateStories();

    // hide everyhing
    hideElements();

    // ...except the story list
    $allStoriesList.show();
  });

  $userProfile.on("click", ".trash-can", async function (evt) {
    // use trashcan to remove user
    if (currentUser) {
      await currentUser.remove();
    }

    // Log out functionality    
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  })

  function loginAndSubmitForm() {
    // A rendering function to run to reset the forms and hide the login info
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // get user profile info
    generateProfile();
  }

  function generateProfile() {
    $("#profile-name").text(`Name: ${currentUser.name}`);
    $("#profile-username").text(`Username: ${currentUser.username}`);
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    // set the navigation to list the username
    $navUserProfile.text(`${currentUser.username}`);
  }

  async function generateStories() {
    // A rendering function to call the StoryList.getStories static method,
    // which will generate a storyListInstance. Then render it.
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  function generateStoryHTML(story, isOwnStory) {
    // A function to render HTML for an individual Story instance
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";

    const trashCanIcon = isOwnStory
      ? `<span class="trash-can">
        <i class="fas fa-trash-alt"></i>
      </span>`
      : "";

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  function generateFaves() {
    // function for showing all stories favorited by current user
    // empty out the list by default
    $favoritedStories.empty();

    // if the user has no favorites
    if (currentUser.favorites.length === 0) {
      $favoritedStories.append("<h5>No favorites added!</h5>");
    } else {
      // for all of the user's favorites
      for (let story of currentUser.favorites) {
        // render each story in the list
        let favoriteHTML = generateStoryHTML(story, false, true);
        $favoritedStories.append(favoriteHTML);
      }
    }
  }

  function generateMyStories() {
    // function for displaying stories posted by current user
    $ownStories.empty();

    // if the user has no stories that they have posted
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      // for all of the user's posted stories
      for (let story of currentUser.ownStories) {
        // render each story in the list
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }

    $ownStories.show();
  }

  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
  }

  function hideElements() {
    // hide all elements in elementsArr
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoritedStories,
      $userProfile
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $(".main-nav-links, #user-profile").toggleClass("hidden");
    $navLogin.hide();
    $navWelcome.show();
    $navLogOut.show();
    $navUserProfile.text(`${currentUser.username}`).show();
  }

  function getHostName(url) {
    // pull the hostname from a URL
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  function syncCurrentUserToLocalStorage() {
    // sync current user information to localStorage
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
