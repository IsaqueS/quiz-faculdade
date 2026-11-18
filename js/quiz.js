/* Registro de matérias. Cada arquivo em conteudos/ chama QUIZ.addCourse({...}).
   O formato completo está em COMO-ADICIONAR-CONTEUDO.md. */
(function () {
  const courses = [];
  function addCourse(c) {
    if (!c || !c.id || !Array.isArray(c.units)) {
      console.error('QUIZ.addCourse: matéria inválida (precisa de id e units).', c);
      return;
    }
    if (courses.some((x) => x.id === c.id)) {
      console.error('QUIZ.addCourse: id de matéria repetido: ' + c.id);
      return;
    }
    courses.push(c);
  }
  window.QUIZ = { courses, addCourse };
})();
