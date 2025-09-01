/**
 * @file filmoteca.js
 * @description Este arquivo é o coração da lógica de dados da aplicação. Ele não manipula o DOM diretamente.
 * Suas responsabilidades são:
 * 1. Persistência de dados: Salvar, carregar e limpar a lista de filmes no localStorage.
 * 2. Operações CRUD: Funções puras para criar, ler, atualizar e deletar filmes (Create, Read, Update, Delete).
 * 3. Lógica de Negócio: Funções para listar, filtrar e agregar dados sobre os filmes.
 */

// Define a chave que será usada para armazenar a lista de filmes no localStorage do navegador.
const STORAGE_KEY = "filmoteca::movies"

// ========================
// Persistência (salvar, carregar, limpar os dados)
// ========================

// Carrega a lista de filmes do localStorage.
// Se não houver dados salvos sob a chave STORAGE_KEY, retorna um array vazio.
const loadMovies = () => {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

// Salva a lista de filmes no localStorage (convertendo para texto JSON)
const saveMovies = movies =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies)) // converte para string

// Remove a entrada de filmes do localStorage, limpando todos os dados salvos.
const clearMovies = () => {
  localStorage.removeItem(STORAGE_KEY)
  console.log("Filmoteca limpa.")
}

// IDs de filmes do TMDB que são usados para popular a aplicação com dados iniciais.
const DEFAULT_MOVIE_IDS = [129, 124, 122, 121, 120, 13, 155, 497, 680, 275]

// Restaura uma lista inicial de filmes.
// Esta função busca os dados completos de cada filme na lista DEFAULT_MOVIE_IDS em paralelo.
const resetMovies = async () => {
  try {
    // Buscar todos os filmes em paralelo
    const moviePromises = DEFAULT_MOVIE_IDS.map(id => 
      fetchCompleteMovieData(id).catch(error => { // busca o filme completo na API
        console.error(`Erro ao buscar filme ${id}:`, error);
        return null; //filtra apenas os filmes válidos 
      })
    );
    
    const moviesArray = await Promise.all(moviePromises); //promisses.all - aguarda todas as buscas
    
    // Filtrar apenas filmes válidos (não nulos)
    const successfulMovies = moviesArray.filter(movie => movie !== null);
    
    saveMovies(successfulMovies) // salva os filmes no localStorage
    console.log("Filmes iniciais salvos.")
    return successfulMovies
  } catch (error) {
    console.error("Erro ao buscar filmes padrão:", error)
    return []
  }
}

// NOTA: Esta função é uma duplicata da que existe em `api.js`.
// Em uma refatoração, o ideal seria que `filmoteca.js` não fizesse chamadas de API diretamente,
// mas sim utilizasse o módulo `API`. Por enquanto, ela serve para buscar os dados completos de um filme.
// Ela busca detalhes e créditos de um filme na API TMDB e formata o resultado em um objeto padronizado.
const fetchCompleteMovieData = async (movieId) => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=pt-BR`, {
      headers: {
        'accept': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiZTNkYzBkZmVlYTY5MmNjOGNlODdlZDY1NDE1MDEzYiIsIm5iZiI6MTc1NjI1NjQ2Ni4zMTMsInN1YiI6IjY4YWU1OGQyZjM2MmQxNWMzMDU2YjViMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.8yVNwwV4SPK_Ut124nmWzAU7urG0Ne4hXGZg4ATgYD4'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const details = await response.json();
    
    // Buscar créditos em paralelo
    const creditsResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?language=pt-BR`, {
      headers: {
        'accept': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiZTNkYzBkZmVlYTY5MmNjOGNlODdlZDY1NDE1MDEzYiIsIm5iZiI6MTc1NjI1NjQ2Ni4zMTMsInN1YiI6IjY4YWU1OGQyZjM2MmQxNWMzMDU2YjViMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.8yVNwwV4SPK_Ut124nmWzAU7urG0Ne4hXGZg4ATgYD4'
      }
    });
    
    const credits = await creditsResponse.json();
    
    // Extrair diretor
    const director = credits.crew 
      ? credits.crew.find(person => person.job === "Director")?.name || "Diretor não informado"
      : "Diretor não informado";
    
    return {
      id: details.id,
      title: details.title,
      director: director,
      year: details.release_date ? new Date(details.release_date).getFullYear() : null,
      overview: details.overview || "Sinopse não disponível",
      posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
      genres: details.genres ? details.genres.map(g => g.name).join(', ') : '',
      runtime: details.runtime,
      voteAverage: details.vote_average
    }
  } catch (error) {
    console.error(`Erro ao buscar filme ${movieId}:`, error);
    return null;
  }
}

// ========================
// CRUD funcional (Create, Read, Update, Delete)
// INÍCIO DO CRUD - Operações básicas de manipulação de dados
// Estas funções seguem o paradigma funcional: elas não modificam o array original (`movies`),
// mas retornam um novo array com as alterações aplicadas (imutabilidade).
// ========================

// Adiciona um novo filme à lista de filmes. Retorna um novo array.
const addMovie = (movies, newMovie) => [...movies, newMovie]

// Atualiza um filme existente na lista.
// Percorre a lista e, quando encontra o filme com o `id` correspondente,
// cria um novo objeto de filme mesclando o antigo com as `updates`.
const updateMovie = (movies, id, updates) =>
  movies.map(movie => (movie.id === id ? { ...movie, ...updates } : movie))

// Remove um filme da lista com base no seu `id`. Retorna um novo array sem o filme removido.
const deleteMovie = (movies, id) =>
  movies.filter(movie => movie.id !== id)

// Verifica se um filme com um determinado `tmdbId` já existe na coleção.
const movieExists = (movies, tmdbId) =>
  movies.some(movie => movie.id === tmdbId)

// Define ou atualiza a avaliação (rating) de um filme.
// Reutiliza a função `updateMovie` para aplicar a atualização.
const rateMovie = (movies, id, rating) =>
  updateMovie(movies, id, { rating })

// ========================
// FIM DO CRUD - Operações básicas de manipulação de dados
// ========================


// ========================
// Listagem e formatação
// Funções para filtrar e agregar dados da coleção de filmes.
// ========================

// Retorna uma nova lista contendo apenas os filmes de um diretor específico.
const listMoviesByDirector = (movies, directorName) =>
  movies.filter(movie => movie.director === directorName)

// Retorna uma nova lista contendo apenas os filmes que incluem um gênero específico.
const listMoviesByGenre = (movies, genreName) =>
  movies.filter(movie => movie.genres && movie.genres.includes(genreName))

// ========================
// Exporta todas as funções como um objeto Filmoteca
// Agrupar as funções em um objeto `Filmoteca` cria um "namespace" que organiza o código
// e torna claro de onde as funções estão vindo quando importadas em outros módulos.
// ========================
export const Filmoteca = {
  // Persistência
  loadMovies, saveMovies, resetMovies, clearMovies,

  // CRUD
  addMovie, updateMovie, deleteMovie, movieExists, rateMovie,

  // Listagem
  listMoviesByDirector, listMoviesByGenre,
}