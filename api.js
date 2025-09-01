/**
 * api.js
 * Este arquivo centraliza toda a lógica de comunicação com a API externa do The Movie Database (TMDB).
 * Ele exporta um objeto 'API' que encapsula funções para buscar, detalhar e processar dados de filmes,
 * abstraindo a complexidade das requisições HTTP para o resto da aplicação.
 */

import { Filmoteca } from './filmoteca.js';

// ========================
// CONFIGURAÇÃO DA API TMDB - Integração com The Movie Database
// ========================

const TMDB_CONFIG = {
  // Token de autenticação Bearer para requisições à API
  token: "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiZTNkYzBkZmVlYTY5MmNjOGNlODdlZDY1NDE1MDEzYiIsIm5iZiI6MTc1NjI1NjQ2Ni4zMTMsInN1YiI6IjY4YWU1OGQyZjM2MmQxNWMzMDU2YjViMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.8yVNwwV4SPK_Ut124nmWzAU7urG0Ne4hXGZg4ATgYD4",
  // Chave da API alternativa (não utilizada com Bearer token)
  apiKey: "be3dc0dfeea692cc8ce87ed65415013b",
  // URL base da API TMDB v3
  baseUrl: "https://api.themoviedb.org/3",
  // URL base para imagens
  imageBaseUrl: "https://image.tmdb.org/t/p/w500"
}

// Função auxiliar para criar os cabeçalhos HTTP necessários para autenticação na API TMDB.
const createTMDBHeaders = () => ({
  'accept': 'application/json',
  'Authorization': `Bearer ${TMDB_CONFIG.token}`
})

// Busca uma lista de filmes na API TMDB com base em uma query (título do filme).
// Retorna um array de resultados ou um array vazio em caso de erro.
const searchMoviesInTMDB = async (query) => {
  try {
    const url = `${TMDB_CONFIG.baseUrl}/search/movie?query=${encodeURIComponent(query)}&language=pt-BR`
    const response = await fetch(url, {
      method: 'GET',
      headers: createTMDBHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`Erro na busca: ${response.status}`)
    }
    
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Erro ao buscar filmes na TMDB:', error)
    return []
  }
}

// Busca os detalhes completos de um filme específico na TMDB usando seu ID.
// Retorna o objeto de detalhes do filme ou null em caso de erro.
const getMovieDetailsFromTMDB = async (movieId) => {
  try {
    const url = `${TMDB_CONFIG.baseUrl}/movie/${movieId}?language=pt-BR`
    const response = await fetch(url, {
      method: 'GET',
      headers: createTMDBHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar detalhes: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar detalhes do filme:', error)
    return null
  }
}

// Busca os créditos (elenco e equipe) de um filme específico na TMDB usando seu ID.
// Retorna o objeto de créditos ou null em caso de erro.
const getMovieCreditsFromTMDB = async (movieId) => {
  try {
    const url = `${TMDB_CONFIG.baseUrl}/movie/${movieId}/credits?language=pt-BR`
    const response = await fetch(url, {
      method: 'GET',
      headers: createTMDBHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar créditos: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar créditos do filme:', error)
    return null
  }
} 

// Função utilitária para extrair o nome do diretor a partir do objeto de créditos.
// Procura na equipe (crew) pela pessoa com o cargo "Director".
const extractDirectorFromCredits = (credits) => {
  if (!credits || !credits.crew) return "Diretor não informado"
  const director = credits.crew.find(person => person.job === "Director")
  return director ? director.name : "Diretor não informado"
}

// Função utilitária para montar a URL completa de uma imagem (poster ou backdrop) a partir do seu caminho relativo.
const createImageUrl = (path) => 
  path ? `${TMDB_CONFIG.imageBaseUrl}${path}` : null

// Orquestra a busca de dados completos de um filme.
// Faz chamadas paralelas para obter detalhes e créditos, e então combina tudo em um único objeto formatado.
const fetchCompleteMovieData = async (movieId) => {
  try {
    // Busca detalhes e créditos em paralelo usando Promise.all (paradigma funcional)
    const [details, credits] = await Promise.all([
      getMovieDetailsFromTMDB(movieId),
      getMovieCreditsFromTMDB(movieId)
    ])
    
    if (!details) return null
    
    // Extrai diretor dos créditos
    const director = extractDirectorFromCredits(credits)
    
    // Retorna objeto estruturado com dados do filme
    return {
      id: details.id,
      title: details.title,
      originalTitle: details.original_title,
      director: director,
      year: details.release_date ? new Date(details.release_date).getFullYear() : null,
      overview: details.overview || "Sinopse não disponível",
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      posterUrl: createImageUrl(details.poster_path),
      backdropUrl: createImageUrl(details.backdrop_path),
      genres: details.genres ? details.genres.map(g => g.name).join(', ') : '',
      runtime: details.runtime,
      voteAverage: details.vote_average,
      popularity: details.popularity,
      // Dados originais da TMDB para referência
      tmdbData: details
    }
  } catch (error) {
    console.error('Erro ao buscar dados completos do filme:', error)
    return null
  }
}

// Função de alto nível que encapsula o fluxo de adicionar um filme da TMDB à coleção local.
// Ela verifica se o filme já existe, busca os dados completos e, se tudo estiver correto,
// adiciona o filme à lista e salva no localStorage.
const addMovieFromTMDB = async (movieId, movies) => {
  try {
    // Verifica se o filme já existe na coleção
    if (Filmoteca.movieExists(movies, movieId)) {
      alert('Este filme já está na sua coleção!');
      return movies;
    }
    
    // Busca dados completos do filme usando paradigma funcional
    const movieData = await fetchCompleteMovieData(movieId);
    
    if (!movieData) {
      alert('Erro ao obter dados do filme.');
      return movies;
    }
    
    // Adiciona filme à coleção usando CRUD funcional
    const updatedMovies = Filmoteca.addMovie(movies, movieData);
    Filmoteca.saveMovies(updatedMovies);
    
    alert(`Filme "${movieData.title}" adicionado com sucesso!`);
    return updatedMovies;
  } catch (error) {
    alert('Erro ao adicionar filme.');
    console.error('Erro:', error);
    return movies;
  }
};

// ========================
// Exporta todas as funções como um objeto API
// Isso cria um "módulo" que pode ser importado em outros arquivos (como ui.js) para usar essas funcionalidades.
// ========================
export const API = {
  searchMoviesInTMDB,
  getMovieDetailsFromTMDB,
  getMovieCreditsFromTMDB,
  extractDirectorFromCredits,
  createImageUrl,
  fetchCompleteMovieData,
  addMovieFromTMDB
}