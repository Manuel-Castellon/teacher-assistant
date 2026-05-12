#!/usr/bin/env python3
"""
SymPy-based math verification for generated exams.

Reads JSON verification items from stdin, returns results to stdout.
Only processes structured data from our own exam generator, never user input.

Input format (JSON array):
[
  {
    "questionRef": "Q1.1",
    "type": "equation",
    "sympyExpression": "Eq((x-1)/2 - (x-6)/3, 3)",
    "expectedAnswer": "{25}"
  }
]

Output format (JSON array):
[
  {
    "questionRef": "Q1.1",
    "isValid": true,
    "computedAnswer": "{25}",
    "message": "Verified: solution matches"
  }
]
"""

import json
import sys
from sympy import (
    symbols, Eq, solve, simplify, oo, S,
    Rational, sympify, solveset, Interval,
    Union, FiniteSet, EmptySet, Lt, Le, Gt, Ge,
    Reals
)
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations,
    implicit_multiplication_application, convert_xor
)
from sympy.solvers.inequalities import solve_univariate_inequality
from sympy.core.relational import Relational

x, y, z = symbols('x y z')

TRANSFORMS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

# Restricted namespace for parsing SymPy expressions we generated ourselves.
# No __builtins__, no imports, no I/O — only SymPy math objects.
_SAFE_NS = {
    "x": x, "y": y, "z": z,
    "Eq": Eq, "Lt": Lt, "Le": Le, "Gt": Gt, "Ge": Ge,
    "Rational": Rational, "S": S, "oo": oo,
    "Interval": Interval, "Union": Union,
    "FiniteSet": FiniteSet, "EmptySet": EmptySet,
    "solve": solve, "simplify": simplify, "sympify": sympify,
}


def _parse(expr_str: str):
    """Parse a SymPy expression string from our own verification data."""
    # Try sympify first (handles basic math like "25", "Rational(4,3)")
    try:
        return sympify(expr_str, locals={"x": x, "y": y, "z": z})
    except Exception:
        pass
    # Try parse_expr for things like "2*x - 3*(x-2)"
    try:
        return parse_expr(expr_str, local_dict={"x": x, "y": y, "z": z},
                          transformations=TRANSFORMS)
    except Exception:
        pass
    # For compound constructs like Eq(...), Interval(...), {25}:
    # compile + exec with restricted namespace (no builtins, no I/O)
    code = compile(expr_str, "<verification>", "eval")
    for name in code.co_names:
        if name not in _SAFE_NS:
            raise ValueError(f"Disallowed name in expression: {name}")
    return eval(code, {"__builtins__": {}}, _SAFE_NS)  # noqa: S307


def verify_equation(expression: str, expected: str) -> dict:
    try:
        expr = _parse(expression)
        computed = solve(expr, x)

        # Identity equation: solve() returns [] when true for all x.
        # Distinguish from no-solution by checking solveset.
        if len(computed) == 0:
            sol_set = solveset(expr, x, domain=S.Reals)
            if sol_set == S.Reals:
                return {
                    "isValid": True,
                    "computedAnswer": "all x (identity)",
                    "message": "Identity equation: true for all values of x",
                }
            if sol_set == EmptySet:
                return {
                    "isValid": False,
                    "computedAnswer": "no solution",
                    "message": f"No solution exists, expected {expected}",
                }

        computed_set = set(computed)
        computed_str = str(computed_set) if len(computed_set) != 1 else str(computed[0])

        expected_parsed = _parse(expected)
        expected_set = expected_parsed if isinstance(expected_parsed, set) else {expected_parsed}

        for c in computed_set:
            matched = False
            for e in expected_set:
                if simplify(c - e) == 0:
                    matched = True
                    break
            if not matched:
                return {
                    "isValid": False,
                    "computedAnswer": computed_str,
                    "message": f"Mismatch: computed {computed_str}, expected {expected}",
                }

        if len(computed_set) != len(expected_set):
            return {
                "isValid": False,
                "computedAnswer": computed_str,
                "message": f"Solution count differs: got {len(computed_set)}, expected {len(expected_set)}",
            }

        return {"isValid": True, "computedAnswer": computed_str, "message": "Verified: solution matches"}

    except Exception as e:
        return {"isValid": False, "computedAnswer": None, "message": f"Error: {e}"}


def verify_inequality(expression: str, expected: str) -> dict:
    try:
        expr = _parse(expression)

        if isinstance(expr, Relational):
            solution = solve_univariate_inequality(expr, x, relational=False)
        else:
            solution = solveset(expr, x, domain=S.Reals)

        computed_str = str(solution)
        expected_eval = _parse(expected)

        if solution == expected_eval:
            return {"isValid": True, "computedAnswer": computed_str, "message": "Verified: solution matches"}

        if hasattr(solution, 'symmetric_difference'):
            diff = solution.symmetric_difference(expected_eval)
            if diff == EmptySet:
                return {"isValid": True, "computedAnswer": computed_str, "message": "Verified: equivalent solution sets"}

        return {
            "isValid": False,
            "computedAnswer": computed_str,
            "message": f"Mismatch: computed {computed_str}, expected {expected}",
        }

    except Exception as e:
        return {"isValid": False, "computedAnswer": None, "message": f"Error: {e}"}


def verify_numeric(expression: str, expected: str) -> dict:
    try:
        computed = _parse(expression)
        expected_val = _parse(expected)

        if simplify(computed - expected_val) == 0:
            return {"isValid": True, "computedAnswer": str(computed), "message": "Verified: numeric value matches"}

        return {
            "isValid": False,
            "computedAnswer": str(computed),
            "message": f"Mismatch: computed {computed}, expected {expected_val}",
        }

    except Exception as e:
        return {"isValid": False, "computedAnswer": None, "message": f"Error: {e}"}


def verify_item(item: dict) -> dict:
    ref = item.get("questionRef", "?")
    vtype = item.get("type", "")
    expr = item.get("sympyExpression", "")
    expected = item.get("expectedAnswer", "")

    result = {"questionRef": ref}

    if vtype == "proof":
        result.update({"isValid": True, "computedAnswer": None, "message": "Proof: requires human review"})
        return result

    if not expr or not expected:
        result.update({"isValid": False, "computedAnswer": None, "message": "Missing expression or expected answer"})
        return result

    if vtype == "equation":
        result.update(verify_equation(expr, expected))
    elif vtype == "inequality":
        result.update(verify_inequality(expr, expected))
    elif vtype == "numeric":
        result.update(verify_numeric(expr, expected))
    else:
        result.update({"isValid": False, "computedAnswer": None, "message": f"Unknown type: {vtype}"})

    return result


def main():
    raw = sys.stdin.read()
    items = json.loads(raw)
    results = [verify_item(item) for item in items]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
