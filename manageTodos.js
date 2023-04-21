const fs = require('fs');
const path = require('path');

const srcFolder = 'app/src';
const docsFolder = 'docs';
const todoDBPath = path.join(docsFolder, 'todoDB.json');
const todosMDPath = path.join(docsFolder, 'todos.md');
const githubRepoRoot = 'https://github.com/theronburger/github-action-test/blob/main';


function searchForTodos(folder) {
  let todos = [];

  const files = fs.readdirSync(folder);
  for (const file of files) {
    const filePath = path.join(folder, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      todos = todos.concat(searchForTodos(filePath));
    } else {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('TODO:')) {
          todos.push({
            filePath,
            line: i + 1,
            content: lines[i].trim(),
            done: false,
          });
        }
      }
    }
  }

  return todos;
}

function updateTodoDB(todos) {
  let todoDB = [];

  if (!fs.existsSync(docsFolder)) {
    fs.mkdirSync(docsFolder);
  }

  if (fs.existsSync(todoDBPath)) {
    todoDB = JSON.parse(fs.readFileSync(todoDBPath, 'utf-8'));
  }

  for (const todo of todos) {
    const existingTodo = todoDB.find(
      (t) => t.filePath === todo.filePath && t.line === todo.line
    );

    if (!existingTodo) {
      todo.timestamp = new Date().toISOString();
      todoDB.push(todo);
    }
  }

  for (const todo of todoDB) {
    if (!todo.done && !todos.some((t) => t.filePath === todo.filePath && t.line === todo.line)) {
      todo.done = true;
      todo.completionTime = new Date().toISOString();
    }
  }

  fs.writeFileSync(todoDBPath, JSON.stringify(todoDB, null, 2), 'utf-8');
  return todoDB;
}

function renderTodosMD(todoDB) {
  let mdContent = '# TODOs\n\n';

  // Sort todos by timestamp, newest to oldest
  todoDB.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Group todos by file
  const groupedTodos = todoDB.reduce((grouped, todo) => {
    if (!grouped[todo.filePath]) {
      grouped[todo.filePath] = [];
    }
    grouped[todo.filePath].push(todo);
    return grouped;
  }, {});

  for (const filePath in groupedTodos) {
    mdContent += `## ${filePath}\n\n`;

    for (const todo of groupedTodos[filePath]) {
      const strippedContent = todo.content.substring(todo.content.indexOf(':') + 1).trim();
      const fileLink = `${githubRepoRoot}/${todo.filePath}#L${todo.line}`;
      mdContent += `- [${todo.done ? 'x' : ' '}] ${strippedContent} ([link](${fileLink})) | Created: ${todo.timestamp}`;
      
      if (todo.done) {
        mdContent += ` | Completed: ${todo.completionTime}`;
      }

      mdContent += `\n`;
    }

    mdContent += '\n';
  }

  if (!fs.existsSync(docsFolder)) {
    fs.mkdirSync(docsFolder);
  }

  fs.writeFileSync(todosMDPath, mdContent, 'utf-8');
}
  
const todos = searchForTodos(srcFolder);
const todoDB = updateTodoDB(todos);
renderTodosMD(todoDB);
console.log('TODOs updated successfully!');
