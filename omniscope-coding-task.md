# Omniscope Coding Task

## Preamble

It is recommended that you read this entire document before starting the task as it might contain information that is key to the successful completion of the task.

## Description

Jupyter notebooks are a commonly used tool both for performing and presenting research in a variety of fields including computational biology. A notebook consists of a number of cells which can either be Markdown cells with support for math and equations for notes and descriptions, or code cells with code that can be executed within the notebook. All cells share the same context, so they can access each other's variables as long as they have been defined. You can learn more about Jupyter notebooks by visiting: the [Jupyter notebook website](https://jupyterbook.org).

Your task is to implement a simple version of a Jupyter notebook: a user should be able to visit a URL (this will obviously be `localhost` when running locally) and be presented with a blank notebook. The user will be able to add a markdown cell or a code cell. For each type of cell, a specific call to action will render the markdown or execute the code depending on the cell type. Markdown rendering can be performed either on the client or the server, but code execution should take place on the server by calling an API. Once a code cell is executed it should display the output below it. The output is the value of the last line in the code if this is either an expression that returns a value or a variable on its own. Any `print` statements should also be considered part of the output. For instance if a cell contains the following code:

```python
x = 1
y = 2
print(f"x = {x}")
print(f"y = {y}")
x + y
``` 

The expected output is:

```
x = 1
y = 2
3
```

## Scope and notes

- You are not expected to implement anything beyond the basic features outlined above.
- React is the recommended framework for the UI, but you are free to use anything you like.
- FastAPI is the recommended backend framework, but other frameworks such as Django or Flask are allowed.
- Your priority should be to **DELIVER THE TASK WITHIN THE 24H PERIOD**, not to use the recommended framework so please use whatever you are most comfortable with.
- It is important that each window/tab gets a different execution context.
- Jupyter notebooks can display tables or charts as well depending on the output. This is outside the scope of this exercise.
- You will not be marked on the aesthethic design of the interface.
- Code should be structured, include type hints and commented using DocStrings.
- Automated tests are not a requirement, but would be given bonus points if included.
- Source control tools such as `Git` are not a requirement, but good use of such tools with frequent well-commented commits would also be given bonus points.
- Use of AI tools such as Chat GPT or Copilot is not discouraged. They are useful tools that can help deliver a task faster and better, but *do keep in mind that you will be asked questions about the code in a subsequent interview so you will need to know how the code works and the reasoning behind various design / implementation decisions*.

## Packaging and delivery

- Any dependencies should be listed in a `requirements.txt`
- A `README.(txt|md|rst)` file needs to be included with running instructions.
- Code needs to be compatible with Python 3.11, 3.12 and/or 3.13 and the version specified in the README.
- The code can either be placed in a private repository on Github with access granted to the user `os-matt`, or as a compressed archive (`zip` or `tar.gz` or `tar.bz2`) and delivered to *matthew@omniscope.ai*.
- Non-essential files such as `pycache` and `venv` directories should not be included in the archive.

## Questions

Any questions should be sent to *matthew@omniscope.ai* and will be answered as soon as possible either by email or by arranging a video-conference. Requirements can often be ambiguous so questions are a normal part of the process and are actually encouraged.

**********
GOOD LUCK!
**********
