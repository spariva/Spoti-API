//? Recuperar el code de spotify
const clientId = import.meta.env.VITE_CLIENT_ID;
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

//? Flujo de autentificación, si no hay code, redirigir a la página de autentificación. Si lo hay, obtener el token de acceso y los datos del usuario.
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

//? Redirigir a la página de autentificación, 
export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    //? Guardar el verifier en localStorage para poder usarlo en el callback (Y comprobar que es el mismo y no hay ataque de CSRF o similar)
    localStorage.setItem("verifier", verifier);
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");

    //? Cambiar el scope según las necesidades
    params.append("scope", "user-read-private user-read-email user-top-read playlist-modify-private playlist-modify-public");

    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

//? Generar un código aleatorio para el code_verifier.
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

//? Generar el code_challenge a partir del code_verifier, usando SHA-256 y codificación Base64 URL-safe..
async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

//? Obtener el token de acceso enviando una solicitud POST a Spotify para intercambiar el code por un access_token usando el code_verifier.
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

//? Obtener los datos del usuario, las canciones y los artistas más escuchados.
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


//? Rellenar la interfaz de usuario con los datos del perfil, las canciones y los artistas.
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

//? Crea tarjetas de Bootstrap para cada pista principal y las añade al DOM.
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
        cardText.innerText = `Followers: ${artist.followers.total} | Popularity: ${artist.popularity}`; 

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
        cardLink.href = artist.external_urls.spotify; 
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
