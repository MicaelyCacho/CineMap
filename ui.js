/**
 * @file ui.js
 * Este arquivo é responsável por toda a lógica de interface do usuário (UI).
 * Ele manipula o DOM, exibe dados, cria formulários dinamicamente e gerencia os eventos
 * de interação do usuário (cliques, submissões de formulário, etc.).
 * Ele importa os módulos 'Filmoteca' e 'API' para interagir com a lógica de dados e a API externa.
 */

import { Filmoteca } from './filmoteca.js';
import { API } from './api.js';

// ===== Dados e elementos =====

// Carrega o estado inicial da aplicação: a lista de filmes do localStorage.
let movies = Filmoteca.loadMovies();

// Garante que, ao carregar a página, o estado (mesmo que vazio) seja salvo.
Filmoteca.saveMovies(movies);

// Seleciona os principais elementos do DOM que serão manipulados para exibir informações e formulários.
const output = document.getElementById('output');   // Área de exibição de resultados
const forms = document.getElementById('forms');     // Área onde formulários aparecem dinamicamente
const menu = document.getElementById('menu');       // Menu lateral que contém os links de ações

// ===== Funções auxiliares para exibição =====

// Função recursiva para criar o HTML das estrelas.
// Gera 5 spans de estrela, preenchendo-as com base na avaliação e na ordem correta.
const createStarsHTML = (rating, current = 1, maxStars = 10) => { // rating pode ser float
  if (current > maxStars) {
    return '';
  }

  const ratingFloor = Math.floor(rating);
  let starHTML;

  if (current <= ratingFloor) {
    // Estrela totalmente preenchida
    starHTML = `<span class="star filled" data-value="${current}">&#9733;</span>`;
  } else if (current === ratingFloor + 1) {
    // Estrela que pode ser parcialmente preenchida
    const decimalPart = rating - ratingFloor;
    const percentage = Math.round(decimalPart * 100);
    // Usa um gradiente linear para preencher a estrela parcialmente
    starHTML = `<span class="star" data-value="${current}" style="background: linear-gradient(to right, #f0c14b ${percentage}%, #ccc ${percentage}%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">&#9733;</span>`;
  } else {
    // Estrela vazia
    starHTML = `<span class="star" data-value="${current}">&#9733;</span>`;
  }

  return starHTML + createStarsHTML(rating, current + 1, maxStars); // Chamada recursiva
};

// Constrói o bloco HTML para um único filme.
// Esta função recebe um objeto de filme e retorna uma string HTML que o representa.
// Inclui lógica para exibir um pôster, informações detalhadas e o sistema de avaliação por estrelas.
const createMovieHTML = (movie) => {
  const posterImg = movie.posterUrl
    ? `<img src="${movie.posterUrl}" alt="Poster de ${movie.title}" class="movie-poster" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDEwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZWVlIi8+Cjx0ZXh0IHg9IjUwIiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U2VtIGltYWdlbTwvdGV4dD4KPC9zdmc+'; this.style.width='100px'; this.style.height='150px';">`
    : `<div class="movie-poster movie-poster-placeholder">
         <span class="material-icons" style="font-size: 48px; color: #888;">movie</span>
         <div style="font-size: 12px; color: #888; text-align: center; margin-top: 8px;">Sem imagem</div>
       </div>`;

  const maxStars = 10;
  // Prioriza a nota do usuário (1-10, inteira). Se não houver, usa a nota da API (0-10, float).
  const rating = movie.rating || movie.voteAverage || 0;

  // Define o texto da nota a ser exibido.
  // Se for nota do usuário, mostra "X/10". Se for da API, mostra o valor decimal (ex: "8.4").
  const scoreText = movie.rating
    ? `${movie.rating}/${maxStars}`
    : (movie.voteAverage ? movie.voteAverage.toFixed(1) : '');

  return `
    <div class="movie-item" data-movie-id="${movie.id}">
      ${posterImg}
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-details">ID: ${movie.id} | Diretor: ${movie.director} | Ano: ${movie.year}</div>
        ${movie.genres ? `<div class="movie-details">Gêneros: ${movie.genres}</div>` : ''}
        ${movie.runtime ? `<div class="movie-details">Duração: ${movie.runtime} min</div>` : ''}
        <div class="movie-details" style="display: flex; align-items: center; gap: 8px;">
          ${scoreText ? `<span>Nota: <strong>${scoreText}</strong></span>` : ''}
          <div class="rating" data-movie-id="${movie.id}">
            ${createStarsHTML(rating, 1, maxStars)}
          </div>
        </div>
        <div class="movie-overview">${movie.overview}</div>
      </div>
    </div>
  `
}

// Renderiza uma lista de filmes no elemento 'output' do DOM.
// Ela mapeia cada filme da lista para seu HTML correspondente usando `createMovieHTML` e os exibe.
const displayMoviesWithImages = (moviesList) => {
  if (moviesList.length === 0) {
    output.innerHTML = '<p>Nenhum filme encontrado.</p>';
    output.style.display = 'block';
    return;
  }

  const moviesHTML = moviesList.map(createMovieHTML).join('');
  output.innerHTML = `<div style="white-space: normal;">${moviesHTML}</div>`;
  output.style.display = 'block';
}

// ===== Forms =====
// Cada função `show...Form` é responsável por gerar o HTML de um formulário específico
// e injetá-lo na div `#forms`. Elas também adicionam os event listeners necessários
// para processar a submissão do formulário.

// Gera o formulário para buscar filmes na API TMDB e adicioná-los à coleção.
function showAddForm() {
  forms.innerHTML = `
    <h3>Buscar e Adicionar Filme</h3>
    <form id="searchForm">
      <input type="text" id="searchQuery" placeholder="Digite o título do filme" required />
      <button type="submit">Buscar na TMDB</button>
    </form>
    <div id="searchResults"></div>
  `;

  // Quando o formulário de busca é enviado
  document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('searchQuery').value;
    const searchResults = document.getElementById('searchResults');

    searchResults.innerHTML = '<p>Buscando filmes...</p>';

    try {
      // Utiliza o módulo API para buscar os filmes.
      const results = await API.searchMoviesInTMDB(query);

      if (results.length === 0) {
        searchResults.innerHTML = '<p>Nenhum filme encontrado.</p>';
        return;
      }

      // Mapeia os resultados da busca em uma lista de divs clicáveis.
      // O `onclick` chama uma função global `window.addMovieFromTMDB` para adicionar o filme selecionado.
      const resultsHTML = results.slice(0, 10).map(movie => `
        <div style="border: 1px solid #ccc; margin: 5px; padding: 10px; cursor: pointer;" 
             onclick="window.addMovieFromTMDB(${movie.id})">
          <strong>${movie.title}</strong> (${movie.release_date ? new Date(movie.release_date).getFullYear() : 'Ano não informado'})
          <br><small>${movie.overview || 'Sinopse não disponível'}</small>
        </div>
      `).join('');

      searchResults.innerHTML = `
        <h4>Resultados encontrados (clique para adicionar):</h4>
        ${resultsHTML}
      `;
    } catch (error) {
      searchResults.innerHTML = '<p>Erro ao buscar filmes. Tente novamente.</p>';
      console.error('Erro na busca:', error);
    }
  });
}

// Função exposta globalmente (no objeto `window`) para ser acessível pelo `onclick` gerado dinamicamente.
// Ela pega o ID do filme, verifica se ele já existe, busca os dados completos na API
// e, finalmente, adiciona o filme à coleção local.
window.addMovieFromTMDB = async (movieId) => {
  try {
    // Verifica se o filme já existe na coleção
    if (Filmoteca.movieExists(movies, movieId)) {
      alert('Este filme já está na sua coleção!');
      return;
    }

    // Busca dados completos do filme usando o módulo API.
    const movieData = await API.fetchCompleteMovieData(movieId);

    if (!movieData) {
      alert('Erro ao obter dados do filme.');
      return;
    }

    // Adiciona o filme ao estado local e salva no localStorage.
    movies = Filmoteca.addMovie(movies, movieData);
    Filmoteca.saveMovies(movies);

    forms.innerHTML = '';
    output.textContent = `Filme "${movieData.title}" adicionado com sucesso!`;
  } catch (error) {
    alert('Erro ao adicionar filme.');
    console.error('Erro:', error);
  }
};

// Gera o formulário para atualizar os dados de um filme existente.
function showUpdateForm() {
  forms.innerHTML = `
    <h3>Atualizar Filme</h3>
    <form id="updateForm">
      <input type="number" id="updateId" placeholder="ID do filme" required />
      <input type="text" id="updateTitle" placeholder="Novo título" />
      <input type="text" id="updateDirector" placeholder="Novo diretor" />
      <input type="number" id="updateYear" placeholder="Novo ano" />
      <textarea id="updateOverview" placeholder="Nova sinopse"></textarea>
      <button type="submit">Atualizar</button>
    </form>
  `;
  document.getElementById('updateForm').addEventListener('submit', e => {
    e.preventDefault();
    const id = Number(document.getElementById('updateId').value);
    const updates = {};
    const title = document.getElementById('updateTitle').value;
    const director = document.getElementById('updateDirector').value;
    const year = document.getElementById('updateYear').value;
    const overview = document.getElementById('updateOverview').value;

    if(title) updates.title = title;
    if(director) updates.director = director;
    if(year) updates.year = Number(year);
    if(overview) updates.overview = overview;

    // Atualiza o filme no estado local e salva.
    movies = Filmoteca.updateMovie(movies, id, updates);
    Filmoteca.saveMovies(movies);
    forms.innerHTML = '';
    output.textContent = 'Filme atualizado!';
  });
}

// Gera o formulário para remover um filme da coleção pelo seu ID.
function showDeleteForm() {
  forms.innerHTML = `
    <h3>Remover Filme</h3>
    <form id="deleteForm">
      <input type="number" id="deleteId" placeholder="ID do filme" required />
      <button type="submit">Remover</button>
    </form>
  `;
  document.getElementById('deleteForm').addEventListener('submit', e => {
    e.preventDefault();
    const id = Number(document.getElementById('deleteId').value);

    // Remove o filme do estado local e salva.
    movies = Filmoteca.deleteMovie(movies, id);
    Filmoteca.saveMovies(movies);
    forms.innerHTML = '';
    output.textContent = 'Filme removido!';
  });
}

// Gera o formulário para filtrar e listar filmes por um diretor específico.
function showListByDirectorForm() {
  forms.innerHTML = `
    <h3>Listar filmes por diretor</h3>
    <form id="directorForm">
      <input type="text" id="directorName" placeholder="Nome do diretor" required />
      <button type="submit">Listar</button>
    </form>
  `;
  document.getElementById('directorForm').addEventListener('submit', e => {
    e.preventDefault();
    const director = document.getElementById('directorName').value;

    // Usa a função de filtragem do módulo Filmoteca.
    const filtered = Filmoteca.listMoviesByDirector(movies, director);
    forms.innerHTML = '';

    // Exibe os resultados (ou uma mensagem de "não encontrado").
    if (filtered.length === 0) {
      output.textContent = 'Nenhum filme encontrado.';
    } else {
      displayMoviesWithImages(filtered);
    }
  });
}

// Gera o formulário para filtrar e listar filmes por um gênero específico.
function showListByGenreForm() {
  forms.innerHTML = `
    <h3>Listar filmes por gênero</h3>
    <form id="genreForm">
      <input type="text" id="genreName" placeholder="Nome do gênero" required />
      <button type="submit">Listar</button>
    </form>
  `;
  document.getElementById('genreForm').addEventListener('submit', e => {
    e.preventDefault();
    const genre = document.getElementById('genreName').value;

    // Usa a função de filtragem do módulo Filmoteca.
    const filtered = Filmoteca.listMoviesByGenre(movies, genre);
    forms.innerHTML = '';

    // Exibe os resultados.
    if (filtered.length === 0) {
      output.textContent = 'Nenhum filme encontrado.';
    } else {
      displayMoviesWithImages(filtered);
    }
  });
}

// ===== Actions =====
// Objeto que funciona como um "despachante de ações".
// A chave (ex: 'list') corresponde ao `data-action` no HTML, e o valor é a função a ser executada.
const actions = { 
   init: async () => { 
     movies = await Filmoteca.resetMovies(); 
     output.textContent = "🎬 Cine Map iniciado com lista de filmes padrão!"; 
     forms.innerHTML = ""; 
     displayMoviesWithImages(movies);
   }, 
   list: () => { forms.innerHTML = ''; displayMoviesWithImages(movies); }, 
   add: () => showAddForm(), 
   update: () => showUpdateForm(), 
   delete: () => showDeleteForm(), 
   clear: () => { forms.innerHTML = ''; Filmoteca.clearMovies(); movies=[]; output.textContent='Cine Map esvaziado.'; }, 
   listByDirector: () => showListByDirectorForm(), 
   listByGenre: () => showListByGenreForm(), // Nova ação para listar por gênero 
   exit: () => { forms.innerHTML = ''; output.textContent='Bye, bye! :)'; } };

// ===== Event listener =====
// Adiciona um único event listener ao menu. Ele usa a delegação de eventos para capturar
// cliques em qualquer link `<a>` dentro do menu.
menu.addEventListener('click', e => {
  if(e.target.tagName === 'A') { // Verifica se o elemento clicado é um link
    e.preventDefault(); // Evita a navegação padrão do link
    const action = e.target.dataset.action; // Lê o "data-action" do link
    if(action && actions[action]) actions[action](); // Executa a função correspondente
    document.getElementById('menu').classList.remove('active'); // Fecha o menu após a ação
  }
});

// Adiciona o evento de clique para o botão "Iniciar", que chama a ação 'init'.
document.getElementById('start-btn').addEventListener('click', () => {
  actions.init();
});

// Adiciona o evento para minimizar o título principal quando o botão "Iniciar" é clicado.
const startBtn = document.getElementById('start-btn');
const mainTitle = document.getElementById('main-title');
startBtn.addEventListener('click', () => {
  mainTitle.classList.add('minimized');
});

// Adiciona um event listener na área de 'output' para lidar com a avaliação de filmes.
// Usando delegação de eventos, ele captura cliques nas estrelas (`.star`),
// identifica o filme e a nota, atualiza o estado e redesenha a lista de filmes.
output.addEventListener('click', (e) => {
  if (e.target.classList.contains('star')) {
    const rating = Number(e.target.dataset.value);
    const movieId = Number(e.target.parentElement.dataset.movieId);
    movies = Filmoteca.rateMovie(movies, movieId, rating);
    Filmoteca.saveMovies(movies);
    displayMoviesWithImages(movies);
  }
});


// Mensagem de log para indicar que o script foi carregado e executado.
console.log('Cine Map iniciado!');