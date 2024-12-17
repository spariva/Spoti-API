// const clientId = import.meta.env.VITE_CLIENT_ID;
// o process.env.VITE_CLIENT_ID;
const clientId = "4d394fd556674a0e95a04ad58648e026";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    const topTracks = await fetchTopTracks(accessToken);
    const topArtists = await fetchTopArtists(accessToken);
    populateUI(profile);
    populateTopTracks(topTracks);
    populateTopArtists(topArtists);
}


export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "user-read-private user-read-email user-top-read playlist-modify-private playlist-modify-public");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function fetchTopTracks(token) {
    const result = await fetch("https://api.spotify.com/v1/me/top/tracks", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function fetchTopArtists(token) {
    const result = await fetch("https://api.spotify.com/v1/me/top/artists", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

function populateUI(profile) {
    document.getElementById("displayName").innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        profileImage.classList.add("rounded-circle");
        document.getElementById("avatar").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("id").innerText = profile.id;
    document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);
}

// function populateTopTracks(tracks) {
//     const topTracks = document.getElementById("topTracks");
//     tracks.items.forEach(track => {
//         const trackElement = document.createElement("li");
//         trackElement.innerText = track.name;
//         topTracks.appendChild(trackElement);
//     });
// }

function populateTopTracks(tracks) {
    const topTracks = document.getElementById("topTracks");
    tracks.items.forEach(track => {
        const cardElement = document.createElement("div");
        cardElement.className = "card";
        cardElement.style.width = "18rem";

        const imgElement = document.createElement("img");
        imgElement.className = "card-img-top";
        imgElement.src = track.album.images[0].url; // Assuming the track object has album images
        imgElement.alt = track.name;

        const cardBody = document.createElement("div");
        cardBody.className = "card-body";

        const cardTitle = document.createElement("h5");
        cardTitle.className = "card-title";
        cardTitle.innerText = track.name;

        const cardText = document.createElement("p");
        cardText.className = "card-text";
        cardText.innerText = track.artists.map(artist => artist.name).join(", "); // Assuming the track object has artists

        const cardLink = document.createElement("a");
        cardLink.className = "btn btn-primary";
        cardLink.href = track.external_urls.spotify; // Assuming the track object has external URLs
        cardLink.innerText = "Go to track";

        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardText);
        cardBody.appendChild(cardLink);

        cardElement.appendChild(imgElement);
        cardElement.appendChild(cardBody);

        topTracks.appendChild(cardElement);
    });
}

// function populateTopArtists(artists) {
//     const topArtists = document.getElementById("topArtists");
//     artists.items.forEach(artist => {
//         const artistElement = document.createElement("li");
//         artistElement.innerText = artist.name;
//         topArtists.appendChild(artistElement);
//     });
// }


function populateTopArtists(artists) {
    const topArtists = document.getElementById("topArtists");
    artists.items.forEach(artist => {
        const cardElement = document.createElement("div");
        cardElement.className = "card";
        cardElement.style.width = "18rem";

        const imgElement = document.createElement("img");
        imgElement.className = "card-img-top";
        imgElement.src = artist.images[0].url; // Assuming the artist object has images
        imgElement.alt = artist.name;

        const cardBody = document.createElement("div");
        cardBody.className = "card-body";

        const cardTitle = document.createElement("h5");
        cardTitle.className = "card-title";
        cardTitle.innerText = artist.name;

        const cardText = document.createElement("p");
        cardText.className = "card-text";
        cardText.innerText = `Followers: ${artist.followers.total} | Popularity: ${artist.popularity}`; // Assuming the artist object has followers

        const genreList = document.createElement("ul");
        genreList.className = "list-group list-group-flush";
        artist.genres.forEach(genre => {
            const genreItem = document.createElement("li");
            genreItem.className = "list-group-item";
            genreItem.innerText = genre;
            genreList.appendChild(genreItem);
        });

        const cardLink = document.createElement("a");
        cardLink.className = "btn btn-primary";
        cardLink.href = artist.external_urls.spotify; // Assuming the artist object has external URLs
        cardLink.innerText = "Go to artist";

        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardText);
        cardBody.appendChild(cardLink);

        cardElement.appendChild(imgElement);
        cardElement.appendChild(cardBody);
        cardElement.appendChild(genreList);

        topArtists.appendChild(cardElement);
    });
}
